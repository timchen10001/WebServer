export const oauth2Mask = (input: string, agent: "google" | "facebook") => {
  return input + ".oauth2." + agent;
};
