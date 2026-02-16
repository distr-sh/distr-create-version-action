import * as core from '@actions/core';
import {DistrService, HelmChartType} from '@distr-sh/distr-sdk';
import * as fs from 'node:fs/promises';

type ResourceInput = {
  name: string;
  content?: string;
  path?: string;
  visibleToCustomers?: boolean;
};

type Resource = {
  name: string;
  content: string;
  visibleToCustomers: boolean;
};

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const token = requiredInput('api-token');
    const apiBase = core.getInput('api-base') || undefined;
    const appId = requiredInput('application-id');
    const versionName = requiredInput('version-name');
    const updateDeployments = core.getBooleanInput('update-deployments');

    const distr = new DistrService({
      apiBase: apiBase,
      apiKey: token,
    });

    const composePath = core.getInput('compose-file');
    const templatePath = core.getInput('template-file');
    const templateFile = templatePath ? await fs.readFile(templatePath, 'utf8') : undefined;
    const linkTemplate = core.getInput('link-template') || undefined;
    const resources = await parseAndResolveResources(core.getInput('resources'));

    let versionId: string;
    if (composePath !== '') {
      const composeFile = await fs.readFile(composePath, 'utf8');
      const version = await distr.createDockerApplicationVersion(appId, versionName, {
        composeFile,
        templateFile,
        linkTemplate,
        resources,
      } as Parameters<typeof distr.createDockerApplicationVersion>[2]);
      if (!version.id) {
        throw new Error('Created version does not have an ID');
      }
      versionId = version.id;
      core.setOutput('created-version-id', version.id);
    } else {
      const chartVersion = requiredInput('chart-version');
      const chartType = requiredInput('chart-type') as HelmChartType;
      const chartName = chartType === 'repository' ? requiredInput('chart-name') : undefined;
      const chartUrl = requiredInput('chart-url');
      const baseValuesPath = core.getInput('base-values-file');
      const baseValuesFile = baseValuesPath ? await fs.readFile(baseValuesPath, 'utf8') : undefined;
      const version = await distr.createKubernetesApplicationVersion(appId, versionName, {
        chartName,
        chartVersion,
        chartType,
        chartUrl,
        baseValuesFile,
        templateFile,
        linkTemplate,
        resources,
      } as Parameters<typeof distr.createKubernetesApplicationVersion>[2]);
      if (!version.id) {
        throw new Error('Created version does not have an ID');
      }
      versionId = version.id;
      core.setOutput('created-version-id', version.id);
    }

    if (updateDeployments) {
      core.info('Updating all deployments to the new version...');
      const result = await distr.updateAllDeployments(appId, versionId);
      core.info(`Updated ${result.updatedTargets.length} deployment target(s)`);
      if (result.skippedTargets.length > 0) {
        core.info(`Skipped ${result.skippedTargets.length} deployment target(s):`);
        result.skippedTargets.forEach((target) => {
          core.info(`  - ${target.deploymentTargetName}: ${target.reason}`);
        });
      }
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}

async function parseAndResolveResources(input: string): Promise<Resource[] | undefined> {
  if (!input) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error('Input "resources" is not valid JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Input "resources" must be a JSON array');
  }

  const resources: Resource[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i] as ResourceInput;

    if (!item.name || typeof item.name !== 'string') {
      throw new Error(`Resource [${i}]: "name" is required and must be a string`);
    }

    const hasContent = item.content !== undefined && item.content !== '';
    const hasPath = item.path !== undefined && item.path !== '';

    if (hasContent && hasPath) {
      throw new Error(`Resource [${i}] "${item.name}": specify either "content" or "path", not both`);
    }
    if (!hasContent && !hasPath) {
      throw new Error(`Resource [${i}] "${item.name}": either "content" or "path" is required`);
    }

    let content: string;
    if (hasPath) {
      try {
        content = await fs.readFile(item.path!, 'utf8');
      } catch (err) {
        throw new Error(
          `Resource [${i}] "${item.name}": failed to read file "${item.path}": ${err instanceof Error ? err.message : err}`
        );
      }
    } else {
      content = item.content!;
    }

    resources.push({
      name: item.name,
      content,
      visibleToCustomers: item.visibleToCustomers ?? true,
    });
  }

  return resources.length > 0 ? resources : undefined;
}

function requiredInput(id: string): string {
  const val = core.getInput(id);
  if (val === '') {
    throw new Error(`Input ${id} is required`);
  }
  return val;
}
