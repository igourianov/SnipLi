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
	const lines = [`# ${jobData.jobTitle}`];
	lines.push(`- **Company:** ${jobData.companyName}`);
	lines.push(`- **URL:** ${jobData.url}`);

	if (jobData.tags.length > 0) {
		lines.push(`- **Tags:** ${jobData.tags.join(" | ")}`);
	}

	lines.push("", "## Job Description", jobData.jobDescription);
	lines.push("", "## Company Description", jobData.companyDescription);

	return lines.join("\n");
}
