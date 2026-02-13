/**
 * @typedef {Object} JobData
 * @property {string} jobTitle
 * @property {string} companyName
 * @property {string} jobDescription
 * @property {string} companyDescription
 * @property {string} url
 * @property {string[]} tags
 */

/**
 * Converts a job data object into a markdown string.
 * @param {JobData} jobData
 * @returns {string}
 */
export function formatMarkdown(jobData) {
  const heading = `# ${jobData.jobTitle} @ ${jobData.companyName}`;

  const lines = [heading];

  if (jobData.tags.length > 0) {
    lines.push(`- **Tags:** ${jobData.tags.join(" | ")}`);
  }

  lines.push(`- **URL:** ${jobData.url}`);

  if (jobData.jobDescription) {
    lines.push("", "## Job Description", jobData.jobDescription);
  }

  if (jobData.companyDescription) {
    lines.push("", "## Company Description", jobData.companyDescription);
  }

  return lines.join("\n");
}
