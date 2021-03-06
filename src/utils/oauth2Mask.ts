export const oauth2Mask = (
  input: string,
  agent: "google" | "facebook" | "twitter"
) => {
  return input + ".oauth2." + agent;
};
