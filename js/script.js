// Mobile navigation and small progressive enhancements.
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const navItems = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll("main section[id]");

function setMenuOpen(isOpen) {
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Close navigation menu" : "Open navigation menu",
  );
  navLinks.classList.toggle("is-open", isOpen);
  document.body.classList.toggle("menu-open", isOpen);
}

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  setMenuOpen(!isOpen);
});

navItems.forEach((item) => {
  item.addEventListener("click", () => setMenuOpen(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
    setMenuOpen(false);
    menuToggle.focus();
  }
});

// Keep the current section reflected in the desktop navigation.
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      navItems.forEach((item) => {
        const isCurrent = item.getAttribute("href") === `#${entry.target.id}`;
        item.classList.toggle("active", isCurrent);
      });
    });
  },
  { rootMargin: "-35% 0px -55% 0px" },
);

sections.forEach((section) => sectionObserver.observe(section));

document.querySelector("#current-year").textContent = new Date().getFullYear();

const contactForm = document.querySelector("#contact-form");
const contactFormStatus = document.querySelector(".contact-form-status");
const contactSubmitButton = contactForm.querySelector(".contact-submit");
const contactSubmitLabel = contactForm.querySelector(".contact-submit-label");
let isSubmittingContactForm = false;

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSubmittingContactForm) return;

  isSubmittingContactForm = true;
  contactSubmitButton.disabled = true;
  contactForm.setAttribute("aria-busy", "true");
  contactSubmitLabel.textContent = "Sending...";
  contactFormStatus.hidden = true;
  contactFormStatus.classList.remove("is-error");

  try {
    const formData = new FormData(contactForm);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
    };
    const response = await fetch("http://127.0.0.1:8000/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = "Sorry, your message couldn’t be sent. Please try again.";
      if (response.status === 422) {
        let errorBody = null;
        try {
          errorBody = await response.json();
        } catch {
          // Use the friendly fallback when the server does not return JSON.
        }

        const detail = errorBody && errorBody.detail;
        const validationMessages = Array.isArray(detail)
          ? detail
              .map((item) => item && item.msg)
              .filter((message) => typeof message === "string")
          : typeof detail === "string"
            ? [detail]
            : [];
        message = validationMessages.length
          ? `Please check your details: ${validationMessages.join(" ")}`
          : "Please check your details and try again.";
      }

      contactFormStatus.textContent = message;
      contactFormStatus.classList.add("is-error");
      contactFormStatus.hidden = false;
      return;
    }

    contactForm.reset();
    contactFormStatus.textContent = "Thanks! Your message has been sent.";
    contactFormStatus.hidden = false;
  } catch (error) {
    console.error("Could not send contact message:", error);
    contactFormStatus.textContent = "Sorry, we couldn’t send your message right now. Please try again.";
    contactFormStatus.classList.add("is-error");
    contactFormStatus.hidden = false;
  } finally {
    isSubmittingContactForm = false;
    contactSubmitButton.disabled = false;
    contactForm.removeAttribute("aria-busy");
    contactSubmitLabel.textContent = "Send Message";
  }
});

const projectsGrid = document.querySelector("#projects-grid");

function showProjectsState(message, isError = false) {
  const state = document.createElement("p");
  state.className = isError ? "projects-state is-error" : "projects-state";
  state.setAttribute("role", isError ? "alert" : "status");
  state.textContent = message;
  projectsGrid.replaceChildren(state);
}

function getSafeGithubUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function createProjectCard(project) {
  const card = document.createElement("article");
  card.className = "project-card api-project-card";

  const heading = document.createElement("div");
  heading.className = "api-project-heading";

  const title = document.createElement("h3");
  title.textContent =
    typeof project.title === "string" && project.title.trim()
      ? project.title
      : "Untitled project";

  const projectNumber = document.createElement("span");
  projectNumber.className = "project-year";
  projectNumber.textContent =
    project.id === undefined || project.id === null
      ? ""
      : String(project.id).padStart(2, "0");

  heading.append(title, projectNumber);

  const description = document.createElement("p");
  description.textContent =
    typeof project.description === "string" ? project.description : "";

  const technologies = document.createElement("p");
  technologies.className = "project-technologies";

  const technologiesLabel = document.createElement("span");
  technologiesLabel.className = "project-label";
  technologiesLabel.textContent = "Technologies";
  technologies.append(
    technologiesLabel,
    document.createTextNode(
      typeof project.technology === "string" && project.technology.trim()
        ? project.technology
        : "Not specified",
    ),
  );

  const safeGithubUrl = getSafeGithubUrl(project.github_link);
  let githubLink;

  if (safeGithubUrl) {
    githubLink = document.createElement("a");
    githubLink.href = safeGithubUrl;
    githubLink.target = "_blank";
    githubLink.rel = "noopener noreferrer";
    githubLink.textContent = "View on GitHub ↗";
  } else {
    githubLink = document.createElement("span");
    githubLink.textContent = "GitHub link unavailable";
    githubLink.className = "is-unavailable";
  }
  githubLink.classList.add("project-github-link");

  card.append(heading, description, technologies, githubLink);
  return card;
}

async function loadProjects() {
  showProjectsState("Loading projects...");

  try {
    const response = await fetch("http://127.0.0.1:8000/projects");
    if (!response.ok) {
      throw new Error(`Projects request failed with status ${response.status}`);
    }

    const projects = await response.json();
    if (!Array.isArray(projects)) {
      throw new Error("Projects response must be a list.");
    }

    if (projects.length === 0) {
      showProjectsState("No projects are available yet.");
      return;
    }

    const projectCards = document.createDocumentFragment();
    projects.forEach((project) => {
      projectCards.append(createProjectCard(project));
    });
    projectsGrid.replaceChildren(projectCards);
  } catch (error) {
    console.error("Could not load projects:", error);
    showProjectsState(
      "Projects couldn’t be loaded right now. Please try again later.",
      true,
    );
  }
}

loadProjects();
