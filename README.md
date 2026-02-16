# distr-create-version-action

This action creates a new version of a
[Distr](https://github.com/distr-sh/distr) application.

Hook it into your CI/CD pipeline to automatically create a new version of your
application in Distr, every time you push a new release. It supports both Docker
and Helm applications.

## Usage

See [action.yml](action.yml).

```yaml
- uses: distr-sh/distr-create-version-action@v1
  with:
    # Path to the Distr API, must end with /api/v1
    # Defaults to https://app.distr.sh/api/v1 – if you are selfhosting set to, e.g. https://distr.example.com/api/v1
    api-base: ''

    # Distr Personal Access Token used to authenticate with the Distr API,
    # to create one, see https://distr.sh/docs/integrations/personal-access-token/
    # This is sensitive, so make sure to use a Github Repository secret to store and read it safely
    # https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions
    # Required
    api-token: ''

    # ID of the Distr application that the version will be created in.
    # You can find and easily copy this ID in the list of applications in the Distr Web UI.
    application-id: ''

    # Name of the version that will be created
    # Required
    version-name: ''

    # Absolute path to the Docker Compose File inside the runner.
    # Example usage: ${{ github.workspace }}/docker-compose-prod.yml
    # Required for docker applications
    compose-file: ''

    # Helm Chart Type (allowed: "repository" or "oci")
    # Required for helm applications
    chart-type: ''

    # Helm Chart Name (required for helm applications if chart-type is "repository")
    chart-name: ''

    # Helm Chart Version (required for helm applications)
    chart-version: ''

    # Helm Chart URL (required for helm applications)
    chart-url: ''

    # Absolute path to the base values file for helm applications.
    # Example usage: ${{ github.workspace }}/base-values.yml
    # Optional
    base-values-file: ''

    # Absolute path to template file for both helm and docker applications.
    # Example usage: ${{ github.workspace }}/template
    # Optional
    template-file: ''

    # Link template for accessing deployed applications. Use template variables like {{ .Env.VARIABLE_NAME }}
    # to dynamically generate links based on deployment environment variables.
    # Example: http://{{ .Env.HELLO_DISTR_HOST }}
    # Optional
    link-template: ''

    # JSON array of resources (markdown documents) to attach to the application version.
    # Each resource must have a "name" and either inline "content" or a "path" to a file on the runner.
    # Optionally set "visibleToCustomers" per resource (defaults to true).
    # Optional
    resources: |
      [
        { "name": "Getting Started", "path": "./docs/getting-started.md", "visibleToCustomers": true },
        { "name": "Release Notes", "content": "# v1.0.0\n\nInitial release." }
      ]

    # If set to true, all deployments of the application will be updated to the newly created version.
    # This will update all deployment targets where this application is deployed.
    # Optional, defaults to false
    update-deployments: false
```

**Docker Example**

```yaml
- name: Checkout
  id: checkout
  uses: actions/checkout@v4

- name: Create Distr Version
  id: distr-create-version
  uses: distr-sh/distr-create-version-action@v1
  with:
    api-token: ${{ secrets.DISTR_API_TOKEN }}
    application-id: '7fa566b3-a20e-4b09-814c-5193c1469f7c'
    version-name: 'v1.0.0'
    compose-file: ${{ github.workspace }}/docker-compose-prod.yml
    template-file: ${{ github.workspace }}/template.env
    link-template: 'http://{{ .Env.APP_HOST }}'
    update-deployments: true

- name: Print Application Version ID
  id: output
  run: echo "${{ steps.distr-create-version.outputs.created-version-id }}"
```

**Docker with Resources Example**

```yaml
- name: Checkout
  id: checkout
  uses: actions/checkout@v4

- name: Create Distr Version
  id: distr-create-version
  uses: distr-sh/distr-create-version-action@v1
  with:
    api-token: ${{ secrets.DISTR_API_TOKEN }}
    application-id: '7fa566b3-a20e-4b09-814c-5193c1469f7c'
    version-name: 'v1.0.0'
    compose-file: ${{ github.workspace }}/docker-compose-prod.yml
    resources: |
      [
        {
          "name": "Getting Started",
          "path": "${{ github.workspace }}/docs/getting-started.md",
          "visibleToCustomers": true
        },
        {
          "name": "Internal Notes",
          "content": "# Internal Notes\n\nThis version includes database migration changes.",
          "visibleToCustomers": false
        }
      ]

- name: Print Application Version ID
  id: output
  run: echo "${{ steps.distr-create-version.outputs.created-version-id }}"
```

### Resources Schema

Each resource in the JSON array supports the following fields:

| Field                | Type    | Required | Default | Description                                                |
| -------------------- | ------- | -------- | ------- | ---------------------------------------------------------- |
| `name`               | string  | yes      |         | Display name of the resource                               |
| `content`            | string  | no\*     |         | Inline markdown content                                    |
| `path`               | string  | no\*     |         | Absolute path to a file on the runner to read content from |
| `visibleToCustomers` | boolean | no       | `true`  | Whether the resource is visible to customers               |

\* Exactly one of `content` or `path` must be provided per resource.

**Helm Example**

```yaml
- name: Checkout
  id: checkout
  uses: actions/checkout@v4

- name: Create Distr Version
  id: distr-create-version
  uses: distr-sh/distr-create-version-action@v1
  with:
    api-token: ${{ secrets.DISTR_API_TOKEN }}
    application-id: '7fa566b3-a20e-4b09-814c-5193c1469f7c'
    version-name: 'v1.0.0'
    chart-type: 'oci'
    chart-url: oci://ghcr.io/your-org/charts/your-chart
    chart-version: 'v1.0.0'
    base-values-file: ${{ github.workspace }}/base-values.yml
    template-file: ${{ github.workspace }}/template.yml
    link-template: 'https://{{ .Env.INGRESS_HOST }}'
    update-deployments: true

- name: Print Application Version ID
  id: output
  run: echo "${{ steps.distr-create-version.outputs.created-version-id }}"
```

## Development

### Install dependencies

```shell
pnpm install
```

### Build the JS bundle

```shell
pnpm run all
```

The bundle has to be commited to the repository, as it is used by the action.

#### (Optional) Test your action locally

The [`@github/local-action`](https://github.com/github/local-action) utility can
be used to test your action locally. It is a simple command-line tool that
"stubs" (or simulates) the GitHub Actions Toolkit. This way, you can run your
TypeScript action locally without having to commit and push your changes to a
repository.

The `local-action` utility can be run in the following ways:

- Visual Studio Code Debugger

  Make sure to review and, if needed, update
  [`.vscode/launch.json`](./.vscode/launch.json)

- Terminal/Command Prompt

  ```shell
  pnpm exec local-action . src/main.ts .env
  ```

You can provide a `.env` file to the `local-action` CLI to set environment
variables used by the GitHub Actions Toolkit. For example, setting inputs and
event payload data used by your action. For more information, see the example
file, [`.env.example`](./.env.example), and the
[GitHub Actions Documentation](https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables).

## Validate the Action

You can now validate the action by referencing it in a workflow file. For
example, [`ci.yml`](./.github/workflows/ci.yml) demonstrates how to reference an
action in the same repository.

```yaml
steps:
  - name: Checkout
    id: checkout
    uses: actions/checkout@v4

  - name: Test Local Action
    id: test-action
    uses: ./
    with:
      # ...

  - name: Print Application Version ID
    id: output
    run: echo "${{ steps.test-action.outputs.created-version-id }}"
```

For example workflow runs, check out the
[Actions tab](https://github.com/distr-sh/distr-create-version-action/actions)!

## Publishing a New Release

This project includes a helper script, [`script/release`](./script/release)
designed to streamline the process of tagging and pushing new releases for
GitHub Actions.

GitHub Actions allows users to select a specific version of the action to use,
based on release tags. This script simplifies this process by performing the
following steps:

1. **Retrieving the latest release tag:** The script starts by fetching the most
   recent SemVer release tag of the current branch, by looking at the local data
   available in your repository.
1. **Prompting for a new release tag:** The user is then prompted to enter a new
   release tag. To assist with this, the script displays the tag retrieved in
   the previous step, and validates the format of the inputted tag (vX.X.X). The
   user is also reminded to update the version field in package.json.
1. **Tagging the new release:** The script then tags a new release and syncs the
   separate major tag (e.g. v1, v2) with the new release tag (e.g. v1.0.0,
   v2.1.2). When the user is creating a new major release, the script
   auto-detects this and creates a `releases/v#` branch for the previous major
   version.
1. **Pushing changes to remote:** Finally, the script pushes the necessary
   commits, tags and branches to the remote repository. From here, you will need
   to create a new release in GitHub so users can easily reference the new tags
   in their workflows.
