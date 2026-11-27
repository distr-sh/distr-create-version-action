/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export declare function run(): Promise<void>;
/**
 * Parses "Name: value" lines into a header map and masks each value in the logs.
 */
export declare function parseExtraHeaders(input: string): Record<string, string> | undefined;
