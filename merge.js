import { getInput, info, warning, setFailed } from "@actions/core";
import { getOctokit } from "@actions/github";

async function merge() {
  const GITHUB_TOKEN = getInput("GITHUB_TOKEN");
  const owner =
    getInput("owner") || (process.env.GITHUB_REPOSITORY || "").split("/")[0];
  const repo =
    getInput("repo") || (process.env.GITHUB_REPOSITORY || "").split("/")[1];
  const head = getInput("source-branch");
  const base = getInput("target-branch");
  const commitMessage =
    getInput("commit-message") || `${head} auto-merged into ${base}`;
  const mergeMethod = getInput("merge_method") || "MERGE";

  if (!GITHUB_TOKEN) {
    return setFailed("GITHUB_TOKEN was not specified");
  }

  if (!owner) {
    return setFailed(
      `Owner of the repository was not specified and could not be derived from GITHUB_REPOSITORY env variable (${process.env.GITHUB_REPOSITORY})`
    );
  }

  if (!repo) {
    return setFailed(
      `Repository name was not specified and could not be derived from GITHUB_REPOSITORY env variable (${process.env.GITHUB_REPOSITORY})`
    );
  }

  if (!["MERGE", "SQUASH", "REBASE"].includes(mergeMethod)) {
    return setFailed(
      `'merge_method' has incorrect value '${mergeMethod}' - must be one of MERGE, SQUASH, or REBASE`
    );
  }

  const octokit = getOctokit(GITHUB_TOKEN);

  info(`Running merge of ${owner}/${repo} ${head} into ${base}`);

  const res = await octokit.repos.merge({
    owner,
    repo,
    base,
    head,
    commit_message: commitMessage,
  });

  if (res) {
    switch (res.status) {
      case 201:
        info(`Merged ${head} into ${base} (${res.data?.sha || ""})`);

        break;

      case 204:
        info(
          "Target branch already contains changes from source branch. Nothing to merge"
        );

        break;

      case 409:
        setFailed(`Merge conflict. ${res.data?.message || ""}`);

        break;

      case 404:
        setFailed(`Branch not found. ${res.data?.message || ""}`);

        break;

      default:
        warning(
          `Merge action has completed, but with an unknown status code: ${res.status}`
        );
    }
  } else {
    return setFailed(
      "An unknown error occurred during merge operation (empty response)"
    );
  }
}

export async function run() {
  return merge().catch((error) => {
    setFailed(`An unexpected error occurred: ${error.message}`);
  });
}
