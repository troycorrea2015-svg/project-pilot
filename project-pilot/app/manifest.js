export default function manifest() {
  return {
    name: "Project Pilot",
    short_name: "Project Pilot",
    description: "Plan, visualize, permit, and manage home projects.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7ff",
    theme_color: "#07172f",
    icons: [{ src: "/project-pilot-approved-mark.png", sizes: "205x205", type: "image/png" }],
  };
}
