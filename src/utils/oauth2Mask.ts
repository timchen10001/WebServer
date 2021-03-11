export const oauth2Mask = (
  uid: string,
  input: string,
  agent: "google" | "facebook" | "twitter"
) => {
  return `${input}.oauth2.${agent}.${uid}`;
};
