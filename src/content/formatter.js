/**
 * @typedef {Object} JobData
 * @property {string} title
 * @property {string} company
 * @property {string} location
 * @property {string} salary
 * @property {string} description
 * @property {string} url
 */

/**
 * Converts a job data object into a markdown string.
 * @param {JobData} jobData
 * @returns {string}
 */
export function formatMarkdown(jobData) {
  return [
    `# ${jobData.title} @ ${jobData.company}`,
    `- **Location:** ${jobData.location}`,
    `- **Salary:** ${jobData.salary}`,
    `- **URL:** ${jobData.url}`,
    "",
    "## Description",
    jobData.description,
  ].join("\n");
}
