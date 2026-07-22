/**
 * Course vocabulary — one module per week of the CityTech TTP summer bootcamp, built from that
 * week's slide decks (`jonathan-chin/citytech-ttpr-2026-summer`, `slides/*.md`).
 *
 * These reuse the vocabulary generator in `vocab.ts` wholesale: a module is just a curated bank
 * of fact-atoms, and every question is assembled fresh (template × term × procedural distractors
 * × shuffle) off the seeded RNG. No new question-generation code.
 *
 * **One bank per week is a pedagogical choice, not a filing convenience.** Distractors are drawn
 * from the same bank, so a Week 1 question offers other git and command-line answers rather than
 * something from Data Visualization. Same-topic distractors are what make a question worth asking.
 *
 * ## How these atoms were made
 *
 * `scripts/extract-course-vocab.mjs` drafts candidates from a week's decks and prints them with
 * provenance; everything below was then curated by hand. That curation is not optional:
 *
 * - Only about half of the slides' `- **Term**: definition` bullets are definitions at all — the
 *   rest are install instructions, link lists, and "Term: value" mappings.
 * - Slide bullets are written to be read *beside their slide title*. An answer option has to
 *   stand alone, so definitions were rewritten to be self-contained and parallel in form.
 * - Every `contrast.with` must name another term in the same bank, which the extractor cannot
 *   guarantee.
 *
 * Definitions and misconceptions stay faithful to how the course taught them.
 *
 * ## No analogies
 *
 * The source is thin on them — four decks of Week 1 contain exactly one ELI5 slide — so pursuing
 * analogies across seven weeks would have meant authoring rather than curating. Every week
 * therefore generates three sub-skills (Definitions, Distinctions, Red flags) instead of four.
 * That is a deliberate gap, not an oversight: `generateVocab` only offers a question type the
 * bank can actually support, so no special-casing is needed.
 *
 * ## Terms that recur across weeks
 *
 * Ten terms are taught in more than one week (Component, Props, Library, Framework, Node.js,
 * `URL parameter`, Dirty/Clean data, Absolute/Relative path). Each bank defines them in that
 * week's own context, which is how the course itself revisits them, and distractors never cross
 * bank boundaries — so a repeated term cannot produce a broken question.
 *
 * ## Deliberately absent
 *
 * `PUT` was dropped as too ambiguous to ask about — the decks teach it only in a single
 * parenthetical. `PATCH` remains, with the contrast that pointed at it taken off.
 *
 * `Ionic` is present but never classified as a library or a framework, because the decks call it
 * both on the same slide. Its contrast with `Capacitor` draws the line the course is clear about
 * instead: shared UI components vs. access to native device features.
 */

import type { QuestionModule } from "../question.js";
import { makeVocabModule, type VocabAtom } from "./vocab.js";

// ---------------------------------------------------------------------------
// Week 1 — Environment Setup and Developer Foundations
// Decks: 2026-06-01 (setup/GitHub), 06-02 (command line + git), 06-03 (git integration,
// the shell), 06-04 (collaboration practices).
// ---------------------------------------------------------------------------

const WEEK_1: VocabAtom[] = [
  // --- git vs GitHub vs gh (06-02) ---
  {
    term: "git",
    definition: "The version-control tool that runs on your own machine and tracks the history of your code.",
    misconception: "git and GitHub are two names for the same thing.",
    contrast: { with: "GitHub", thisIs: "A tool running on your machine that tracks history" },
  },
  {
    term: "GitHub",
    definition: "A service that hosts git repositories online and adds pull requests, issues, and collaboration tools.",
    contrast: { with: "git", thisIs: "A website that hosts repositories and adds collaboration tools" },
  },
  {
    term: "`gh`",
    definition: "GitHub's command-line tool for GitHub-specific actions like pull requests, issues, and forking.",
    contrast: { with: "git", thisIs: "A CLI for GitHub actions like pull requests and issues" },
  },

  // --- The four areas of git (06-02) ---
  {
    term: "Working directory",
    definition: "The files you are editing right now, before any of the changes have been marked for a commit.",
    contrast: { with: "Staging area", thisIs: "The files as you are currently editing them" },
  },
  {
    term: "Staging area",
    definition: "The changes you have marked with `git add` to be included in the next commit.",
    misconception: "Once you have run `git add`, later edits to that file are staged automatically too.",
    contrast: { with: "Working directory", thisIs: "Changes marked with `git add` for the next commit" },
  },
  {
    term: "Local repository",
    definition: "Your committed history, stored on your own machine by `git commit`.",
    contrast: { with: "Remote repository", thisIs: "The committed history stored on your own machine" },
  },
  {
    term: "Remote repository",
    definition: "The shared copy of a repository on GitHub that a team pushes to and pulls from.",
    contrast: { with: "Local repository", thisIs: "The shared copy everyone syncs with" },
  },

  // --- Getting and syncing code (06-02) ---
  {
    term: "Clone",
    definition: "Downloading a full copy of a remote repository, with its complete history, onto your machine.",
    contrast: { with: "Fork", thisIs: "Copying a repository down onto your own machine" },
  },
  {
    term: "Fork",
    definition: "Making your own copy of someone else's repository on GitHub, so you can change it without write access to the original.",
    misconception: "Forking gives you write access to the original repository.",
    contrast: { with: "Clone", thisIs: "Making your own copy of a repository on GitHub" },
  },
  {
    term: "Pull",
    definition: "Fetching the latest commits from the remote and merging them into your current local branch.",
    contrast: { with: "Push", thisIs: "Bringing the remote's newer commits down into your branch" },
  },
  {
    term: "Push",
    definition: "Uploading the commits you have made locally to the remote repository so others can see them.",
    contrast: { with: "Pull", thisIs: "Sending your local commits up to the remote" },
  },
  {
    term: "`origin`",
    definition: "The default name for the remote a repository was cloned from — an alias for its GitHub URL.",
    misconception: "`origin` is a branch, like `main`.",
  },

  // --- Integrating changes (06-03), analogies from the course's own ELI5 slide ---
  {
    term: "Fast-forward",
    definition: "Moving a branch pointer straight to the newer commits when the branch has not diverged, creating no new commit.",
    contrast: { with: "Merge", thisIs: "Sliding the pointer forward with no new commit" },
  },
  {
    term: "Merge",
    definition: "Joining two diverged branches with a dedicated merge commit, keeping both lines of history visible.",
    contrast: { with: "Fast-forward", thisIs: "Creating a merge commit that joins two diverged histories" },
  },
  {
    term: "Rebase",
    definition: "Replaying your commits on top of the latest `main`, rewriting them so the history stays linear.",
    misconception: "Rebase and merge do the same thing, just with different commands.",
    contrast: { with: "Merge", thisIs: "Rewriting your commits on top of the newest work, for a linear history" },
  },
  {
    term: "Merge conflict",
    definition: "What happens when two branches change the same lines of a file differently and git cannot decide which version to keep.",
    misconception: "Getting a merge conflict means you did something wrong.",
  },

  // --- The command line (06-03) ---
  {
    term: "Command line",
    definition: "A text interface for running programs, which is fast, scriptable, and works on machines with no graphical interface at all.",
    contrast: { with: "GUI", thisIs: "A text interface that runs fine on minimal or remote machines" },
  },
  {
    term: "GUI",
    definition: "A graphical user interface, driven by windows and clicking, which needs more powerful hardware than a plain terminal.",
    contrast: { with: "Command line", thisIs: "A graphical interface that needs more capable hardware" },
  },
  {
    term: "Absolute path",
    definition: "A path that starts at the root of the filesystem, `/`, and so means the same thing from any directory.",
    contrast: { with: "Relative path", thisIs: "Starts at the filesystem root and never depends on where you are" },
  },
  {
    term: "Relative path",
    definition: "A path that starts from whichever directory you are currently in.",
    contrast: { with: "Absolute path", thisIs: "Starts from your current directory" },
  },
  {
    term: "`~`",
    definition: "A shortcut that always expands to your own home directory, wherever it happens to live.",
    contrast: { with: "`/home`", thisIs: "A shortcut standing for your own home directory" },
  },
  {
    term: "`/home`",
    definition: "On Linux and WSL, the directory that holds every user's home directory — yours is `/home/<username>` inside it.",
    misconception: "`/home` is your home directory.",
    contrast: { with: "`~`", thisIs: "The parent directory holding everyone's home directories" },
  },
  {
    term: "Directory",
    definition: "A container that holds files and other directories — the same thing a graphical file browser calls a folder.",
    misconception: "A directory and a folder are two different things.",
  },
  {
    term: "WSL",
    definition: "Windows Subsystem for Linux: a real Linux environment running on Windows, giving you the same Unix shell and package manager as macOS and Linux users.",
  },
  {
    term: "SSH key",
    definition: "A pair of cryptographic keys that lets you authenticate to a service like GitHub without typing a password.",
    misconception: "You should paste your private key into GitHub.",
  },

  // --- Web concepts introduced in review (06-02) ---
  {
    term: "SPA",
    definition: "A single-page application, where navigating re-renders only the part of the page that changed instead of reloading the whole page.",
    misconception: "A single-page application means the app only has one screen.",
  },
  {
    term: "CORS",
    definition: "The browser rule that stops a site from reading a response from another origin unless that origin explicitly allows it.",
    misconception: "CORS stops the request from ever being sent.",
  },

  // --- Collaboration practices (06-04) ---
  {
    term: "Issue",
    definition: "A tracked item on a repository — a bug, task, or question — with its own title, description, comments, and open or closed status.",
    misconception: "Issues are only for reporting bugs.",
    contrast: { with: "Stand-up", thisIs: "A written, tracked item that lives on the repository" },
  },
  {
    term: "Stand-up",
    definition: "A short daily team meeting where each person says what they did yesterday, what they are doing today, and any blockers.",
    misconception: "A stand-up is where the team works through and solves each blocker.",
    contrast: { with: "Issue", thisIs: "A short spoken meeting held daily to keep a team in sync" },
  },
  {
    term: "Blocker",
    definition: "Anything stopping your progress — a bug, missing access, unclear requirements, or waiting on someone else.",
    misconception: "Raising a blocker signals that you are not capable of doing the work.",
  },
];

// ---------------------------------------------------------------------------
// Week 2 — Web and JavaScript in Professional Practice
// Decks: 2026-06-08 … 06-11
// ---------------------------------------------------------------------------

const WEEK_2: VocabAtom[] = [
  // --- Websites, HTML and CSS (2026-06-08, 2026-06-10) ---
  {
    term: "HTML",
    definition:
      "HyperText Markup Language: the language that wraps content in tags describing a page's structure and meaning.",
    misconception:
      "HTML is a programming language, so you can write logic and loops in it.",
    contrast: {
      with: "CSS",
      thisIs: "The structure and content of a page",
    },
  },
  {
    term: "CSS",
    definition:
      "Cascading Style Sheets: the language that controls how a page looks - colours, fonts, spacing and layout.",
    misconception:
      "CSS decides what content appears on the page, not just how that content looks.",
    contrast: {
      with: "HTML",
      thisIs: "The presentation and styling of a page",
    },
  },
  {
    term: "Specificity",
    definition:
      "The CSS rule that decides which style wins when several target one element: ID beats class, class beats type.",
    misconception:
      "The rule written last in the stylesheet always wins, no matter which selectors are used.",
  },

  // --- React fundamentals (2026-06-08, 2026-06-10) ---
  {
    term: "React",
    definition:
      "A JavaScript library, open-sourced by Facebook in 2013, for building user interfaces out of reusable components.",
    misconception:
      "React replaces HTML and CSS, so a React app never produces them for the browser.",
  },
  {
    term: "Component",
    definition:
      "A reusable, self-contained piece of user interface written as a function that takes data and returns markup.",
    misconception:
      "Changing one component's data forces React to redraw the entire page from scratch.",
  },
  {
    term: "JSX",
    definition:
      "A syntax that lets you write HTML-like markup directly inside your JavaScript files.",
    misconception:
      "JSX is understood by browsers directly, so it needs no compilation step.",
  },
  {
    term: "Props",
    definition:
      "The data a parent component passes down into a child component when it renders it.",
    contrast: {
      with: "State",
      thisIs: "Data handed down to a component by its parent",
    },
  },
  {
    term: "State",
    definition:
      "Data a component remembers between renders; changing it tells React to re-render that component.",
    misconception:
      "A normal variable works just as well as state, because changing it also updates the screen.",
    contrast: {
      with: "Props",
      thisIs: "Data a component owns and remembers across renders",
    },
  },
  {
    term: "`useState`",
    definition:
      "The React hook that declares state, returning an array of the current value and a setter that updates it.",
    misconception:
      "`useState` returns a single value, so you read and write it like an ordinary variable.",
  },
  {
    term: "Single-page app (SPA)",
    definition:
      "A site that loads once and then updates only the parts of the screen that change, instead of reloading whole pages.",
    misconception:
      "A single-page app can only ever show one screen's worth of content to the user.",
  },

  // --- Tooling: build, run, package (2026-06-08) ---
  {
    term: "Boilerplate",
    definition:
      "The standard, repeated setup code and config a project needs before any features are written.",
    misconception:
      "Boilerplate is wasted code, so a good developer always writes the whole project setup by hand.",
  },
  {
    term: "Vite",
    definition:
      "A modern web tool that acts as both a build tool and a dev server, and scaffolds new projects.",
  },
  {
    term: "Build tool",
    definition:
      "A tool that turns your many source files into optimized, bundled, minified files a browser can run.",
    contrast: {
      with: "Dev server",
      thisIs: "Produces optimized output files for the browser",
    },
  },
  {
    term: "Dev server",
    definition:
      "A tool that runs your app locally while you develop, refreshing the page instantly when you save a file.",
    misconception:
      "The dev server produces the optimized files you deploy to production.",
    contrast: {
      with: "Build tool",
      thisIs: "Runs the app locally with hot reload while coding",
    },
  },
  {
    term: "`src/`",
    definition:
      "The folder holding the source code you write by hand: TypeScript, JSX and CSS files.",
    contrast: {
      with: "`dist/`",
      thisIs: "The hand-written files a developer edits",
    },
  },
  {
    term: "`dist/`",
    definition:
      "The folder of optimized, browser-ready files that a build generates from your source code.",
    misconception:
      "You can fix a bug quickly by hand-editing the built output files.",
    contrast: {
      with: "`src/`",
      thisIs: "Generated output, regenerated on every build",
    },
  },
  {
    term: "Yarn",
    definition:
      "The package manager this course uses to install and manage a project's dependencies, recording them in `yarn.lock`.",
    contrast: {
      with: "npm",
      thisIs: "The alternative package manager we chose to use",
    },
  },
  {
    term: "npm",
    definition:
      "The package manager that ships with Node, reading `package.json` and writing `package-lock.json`.",
    misconception:
      "npm and Yarn read different project files, so a project must pick one before writing `package.json`.",
    contrast: {
      with: "Yarn",
      thisIs: "The package manager bundled with Node itself",
    },
  },

  // --- JavaScript and TypeScript (2026-06-09) ---
  {
    term: "JavaScript",
    definition:
      "The programming language of the web, adding behaviour to pages and running in every browser.",
    misconception:
      "JavaScript only runs inside a browser and cannot be used to write server code.",
    contrast: {
      with: "TypeScript",
      thisIs: "Dynamically typed: type errors surface only at runtime",
    },
  },
  {
    term: "TypeScript",
    definition:
      "JavaScript plus static types, built on top of it and compiled down to plain JavaScript before it runs.",
    misconception:
      "TypeScript is a separate language, so plain JavaScript is invalid inside a TypeScript file.",
    contrast: {
      with: "JavaScript",
      thisIs: "Statically typed: mistakes are caught before running",
    },
  },
  {
    term: "Node.js",
    definition:
      "A runtime that runs JavaScript outside the browser, making full-stack work in a single language possible.",
    misconception:
      "Node.js is a different programming language you have to learn separately from JavaScript.",
  },
  {
    term: "Relative path",
    definition:
      "An import path resolved from the current file's own location, written like `./Button` or `../utils/format`.",
    contrast: {
      with: "Absolute path",
      thisIs: "Resolved starting from the importing file itself",
    },
  },
  {
    term: "Absolute path",
    definition:
      "An import path resolved from a package name or a configured project root, such as `react` or `@/components/Button`.",
    misconception:
      "Absolute import paths always work out of the box with no configuration.",
    contrast: {
      with: "Relative path",
      thisIs: "Resolved from a package or configured project root",
    },
  },
  {
    term: "JavaScript object",
    definition:
      "A grouping of related data as key-value pairs, where values may be any type including other objects.",
    contrast: {
      with: "JSON",
      thisIs: "Live code in a program, able to hold any value type",
    },
  },
  {
    term: "JSON",
    definition:
      "JavaScript Object Notation: a plain-text data format modelled on JS objects, used by APIs and config files.",
    misconception:
      "JSON is just a JavaScript object, so single quotes and comments are fine in it.",
    contrast: {
      with: "JavaScript object",
      thisIs: "A text format with double-quoted keys and no functions",
    },
  },

  // --- Follow-ups and professional practice (2026-06-09, 2026-06-10, 2026-06-11) ---
  {
    term: "Library",
    definition:
      "Third-party code that you call yourself, leaving you in control of the flow and generally easy to swap out.",
    contrast: {
      with: "Framework",
      thisIs: "Code you call, keeping control of your program's flow",
    },
  },
  {
    term: "Framework",
    definition:
      "Third-party code that dictates your project's structure and lifecycle, making it a long-term commitment.",
    misconception:
      "A framework is just a bigger library, so swapping it out later is no harder.",
    contrast: {
      with: "Library",
      thisIs: "Dictates structure and lifecycle, hard to replace later",
    },
  },
  {
    term: "Token-based auth",
    definition:
      "Authenticating git operations with an SSH key or personal access token, which are scoped and revocable, instead of a password.",
    misconception:
      "You can still push to GitHub by typing your account password when git asks.",
  },
  {
    term: "`main`",
    definition:
      "The modern default branch name, which GitHub adopted for new repositories in 2020 as more inclusive terminology.",
    contrast: {
      with: "`master`",
      thisIs: "The modern default branch name used by new repos",
    },
  },
  {
    term: "`master`",
    definition:
      "Git's old default branch name, still seen in older repositories and tutorials.",
    misconception:
      "`master` and `main` behave differently, so renaming the branch changes what git does.",
    contrast: {
      with: "`main`",
      thisIs: "Git's older default branch name, seen in legacy repos",
    },
  },
];

// ---------------------------------------------------------------------------
// Week 3 — APIs, Data and Backend Foundations
// Decks: 2026-06-15 … 06-18
// ---------------------------------------------------------------------------

const WEEK_3: VocabAtom[] = [
  // --- APIs and REST (2026-06-15) ---
  {
    term: "API",
    definition: "An interface that lets one program request data or actions from another, exchanging plain data rather than pages.",
    misconception: "An API sends back a whole web page with its UI, which your app then displays.",
    contrast: { with: "REST", thisIs: "Any interface letting programs talk to each other" },
  },
  {
    term: "REST",
    definition: "A common style for HTTP APIs where resources live at URLs and are acted on with standard HTTP methods.",
    misconception: "REST is its own network protocol that you use instead of HTTP.",
    contrast: { with: "API", thisIs: "One particular style of building HTTP APIs" },
  },
  {
    term: "Stateless",
    definition: "Each request carries everything the server needs, and the server remembers nothing between requests.",
    misconception: "The server remembers who you are after your first request, so later requests can leave the token out.",
    contrast: { with: "Stateful", thisIs: "Server keeps no memory between requests" },
  },
  {
    term: "Stateful",
    definition: "The server remembers context about you between requests, keeping a server-side session of who and where you are.",
    misconception: "Being stateful makes a service easier to scale, since any server can pick up any request.",
    contrast: { with: "Stateless", thisIs: "Server stores session context between requests" },
  },
  {
    term: "PATCH",
    definition: "The HTTP method that updates part of a resource, sending only the fields you want changed.",
    misconception: "PATCH requires you to send every field of the resource, or the missing ones are wiped.",
  },
  {
    term: "Status code",
    definition: "A three-digit number on every HTTP response saying how it went: 2xx success, 3xx redirect, 4xx your mistake, 5xx the server's.",
    misconception: "A 404 means the server itself is broken or offline.",
  },
  {
    term: "API token",
    definition: "A key sent with each request so an API can identify, limit, audit and if needed revoke a particular caller.",
    misconception: "Every API key is a secret, so no key should ever appear in client-side code.",
  },

  // --- Calling APIs from code (2026-06-15) ---
  {
    term: "Node.js",
    definition: "The runtime that runs JavaScript outside the browser, on your machine or a server, for scripts and backends.",
    misconception: "Node.js is a different language that you have to learn after browser JavaScript.",
  },
  {
    term: "`fetch`",
    definition: "The built-in function for making HTTP requests from JavaScript, returning a Promise you await for the response.",
    misconception: "You must install a package before you can use `fetch` in a Node script.",
  },
  {
    term: "Synchronous",
    definition: "Code that runs one line at a time, each line waiting for the one before it to finish.",
    contrast: { with: "Asynchronous", thisIs: "Every line waits for the previous one" },
  },
  {
    term: "Asynchronous",
    definition: "Code where slow work such as a network call runs in the background while the rest of the program keeps going.",
    misconception: "An asynchronous API call freezes the whole app until the response comes back.",
    contrast: { with: "Synchronous", thisIs: "Slow work runs without blocking the program" },
  },

  // --- Requests, headers and endpoints (2026-06-16) ---
  {
    term: "Endpoint",
    definition: "A specific address an API exposes that a client can send requests to, such as `/books/42`.",
    misconception: "`GET /books/42` and `DELETE /books/42` are two separate endpoints.",
  },
  {
    term: "HTTP header",
    definition: "A key-value pair of metadata sent with a request or response, describing it rather than carrying its data.",
    misconception: "Headers such as `Authorization` travel inside the request body along with the JSON.",
  },

  // --- Express (2026-06-16, 2026-06-17) ---
  {
    term: "Express",
    definition: "A minimal Node.js web framework for building your own server that responds to HTTP requests.",
    misconception: "Data an Express server keeps in variables survives a restart of the server.",
  },
  {
    term: "Route handler",
    definition: "The function `(req, res)` Express runs when a request matches a particular method and path, and which sends the reply.",
    contrast: { with: "Middleware", thisIs: "Runs only when a request matches its method and path" },
  },
  {
    term: "Middleware",
    definition: "A function Express runs between receiving a request and sending the response, passing control on by calling `next()`.",
    misconception: "Middleware only runs when you call it yourself from inside a route handler.",
    contrast: { with: "Route handler", thisIs: "Runs automatically on every request, before any handler" },
  },
  {
    term: "`express.json()`",
    definition: "The middleware that reads a request's raw body and parses the JSON into `req.body`.",
    misconception: "`req.body` already contains the posted JSON, so registering `express.json()` is optional.",
  },
  {
    term: "URL parameter",
    definition: "A named segment of a route path, like `:n` in `/square/:n`, whose value arrives as a string on `req.params`.",
    misconception: "A single route with URL parameters can accept any number of values you pass it.",
    contrast: { with: "Query parameter", thisIs: "A fixed-count named segment inside the path" },
  },
  {
    term: "Query parameter",
    definition: "A key-value pair after the `?` in a URL, arriving on `req.query`, used for variable or optional input.",
    misconception: "Query parameter values arrive already typed as numbers, so no conversion is needed.",
    contrast: { with: "URL parameter", thisIs: "Optional, variable-length input after the `?`" },
  },

  // --- Secrets, tooling and project structure (2026-06-17) ---
  {
    term: "Yarn Classic",
    definition: "The original 1.x line of Yarn, which installs dependencies into a traditional `node_modules/` folder like npm.",
    contrast: { with: "Yarn Modern", thisIs: "Installs into a traditional `node_modules/` folder" },
  },
  {
    term: "Yarn Modern",
    definition: "The rewritten 4.x line of Yarn, which by default uses Plug'n'Play for faster installs and stricter resolution.",
    misconception: "Yarn Modern still creates a `node_modules/` folder by default, so every tool works unchanged.",
    contrast: { with: "Yarn Classic", thisIs: "Uses Plug'n'Play instead of `node_modules` by default" },
  },
  {
    term: "`.env`",
    definition: "A gitignored file holding the real secret values, such as API keys, that your project needs to run.",
    misconception: "Deleting a committed `.env` in a later commit removes the secret from the repository.",
    contrast: { with: "`.env.example`", thisIs: "Holds real values and is never committed" },
  },
  {
    term: "`.env.example`",
    definition: "A committed template listing the key names a project needs, with no real values, so teammates know what to fill in.",
    contrast: { with: "`.env`", thisIs: "Committed template of key names with no values" },
  },
  {
    term: "`.gitignore`",
    definition: "A file listing paths git should not track, typically secrets and generated output that can be rebuilt from source.",
    misconception: "Generated folders like `node_modules/` should be committed so teammates do not have to install anything.",
  },
  {
    term: "Monorepo",
    definition: "One git repository holding many related projects in subfolders, with a single clone and shared history.",
    misconception: "Putting a server and client in sibling subfolders makes the project a monorepo.",
    contrast: { with: "Polyrepo", thisIs: "One repository and one history for many projects" },
  },
  {
    term: "Polyrepo",
    definition: "An arrangement where each related project lives in its own git repository with independent history, versioning and deploys.",
    contrast: { with: "Monorepo", thisIs: "A separate repository per project" },
  },

  // --- Pair programming and interviews (2026-06-17, 2026-06-18) ---
  {
    term: "Driver",
    definition: "The person at the keyboard during pair programming, typing the code while the other reviews.",
    contrast: { with: "Navigator", thisIs: "Types the code during the pairing session" },
  },
  {
    term: "Navigator",
    definition: "The person in a pair who reviews, thinks ahead, spots issues and suggests direction while the other types.",
    misconception: "The navigator just waits quietly until it is their turn at the keyboard.",
    contrast: { with: "Driver", thisIs: "Reviews and thinks ahead without typing" },
  },
  {
    term: "Whiteboard coding",
    definition: "An interview format where you write code by hand while explaining your reasoning out loud.",
    misconception: "Whiteboard interviews are scored on producing perfect, complete, bug-free syntax.",
  },
];

// ---------------------------------------------------------------------------
// Week 4 — Databases and SQL
// Decks: 2026-06-22 … 06-25
// ---------------------------------------------------------------------------

const WEEK_4: VocabAtom[] = [
  // --- Database terminology (2026-06-22) ---
  {
    term: "Database",
    definition: "An organized collection of related tables stored together on disk, so the data survives after a program stops.",
    misconception: "A database keeps its data in RAM, so restarting the server wipes everything it holds.",
    contrast: { with: "Table", thisIs: "A collection of many related tables stored together" },
  },
  {
    term: "Table",
    definition: "A single collection of one kind of thing, organized into rows and columns like a spreadsheet.",
    contrast: { with: "Database", thisIs: "One kind of thing, stored as rows and columns" },
  },
  {
    term: "Column (or field)",
    definition: "One attribute that every row in a table has, such as a student's `major`.",
    misconception: "Two rows in the same table can have completely different columns from each other.",
    contrast: { with: "Row (or record)", thisIs: "One attribute shared by every entry in the table" },
  },
  {
    term: "Row (or record)",
    definition: "One entry in a table: all of the fields belonging to a single item.",
    contrast: { with: "Column (or field)", thisIs: "All the fields belonging to a single entry" },
  },
  {
    term: "Schema",
    definition: "The structure of your data: which tables exist, their columns, and each column's type.",
    misconception: "A table's schema changes every time you insert or delete rows of data.",
    contrast: { with: "Query", thisIs: "The blueprint defining tables, columns and their types" },
  },
  {
    term: "Query",
    definition: "A request to the database written in SQL, such as reading certain columns from a table.",
    misconception: "You can write a query's clauses in any order as long as each one is spelled correctly.",
    contrast: { with: "Schema", thisIs: "A single SQL request that reads or changes data" },
  },
  {
    term: "SQL",
    definition: "Structured Query Language: the declarative language used to create, read, update and delete data in a relational database.",
    misconception: "SQL only lets you read data; you need another language to insert, update or delete it.",
  },

  // --- Keys and relationships (2026-06-22) ---
  {
    term: "Primary key",
    definition: "A column whose value uniquely identifies each row in its table, so no two rows share it.",
    misconception: "A primary key value can be reused by another row as long as the other columns differ.",
    contrast: { with: "Foreign key", thisIs: "Uniquely identifies each row within its own table" },
  },
  {
    term: "Foreign key",
    definition: "A column that points to the primary key of another table, linking rows across the two tables.",
    misconception: "A foreign key is an ordinary column of numbers with no connection to any other table.",
    contrast: { with: "Primary key", thisIs: "Points at another table's primary key to link them" },
  },
  {
    term: "Relational database",
    definition: "A database where data lives in tables with a fixed schema that relate to each other and are queried with SQL.",
    contrast: { with: "Non-relational database", thisIs: "Tables with a fixed schema, queried with SQL" },
  },
  {
    term: "Non-relational database",
    definition: "A \"NoSQL\" database that stores data as documents, key-value pairs or graphs rather than tables.",
    misconception: "A NoSQL database is just a relational database that uses a different query language.",
    contrast: { with: "Relational database", thisIs: "Flexible documents or key-value pairs, no fixed schema" },
  },

  // --- Join types (2026-06-23) ---
  {
    term: "Inner join",
    definition: "A join that keeps only the rows that match in both tables and drops everything else.",
    misconception: "An inner join keeps every row from the left table, filling in `NULL` where there is no match.",
    contrast: { with: "Left join", thisIs: "Drops rows that have no match in the other table" },
  },
  {
    term: "Left join",
    definition: "A join that keeps every row from the left table plus matching right-table columns, using `NULL` where none match.",
    misconception: "A left join drops rows from the left table when the right table has no matching row.",
    contrast: { with: "Inner join", thisIs: "Keeps unmatched left-table rows, padded with `NULL`" },
  },
  {
    term: "Right join",
    definition: "A join that keeps every row from the right table plus matching left-table columns, using `NULL` where none match.",
    contrast: { with: "Full outer join", thisIs: "Keeps every right-table row but drops unmatched left rows" },
  },
  {
    term: "Full outer join",
    definition: "A join that keeps all rows from both tables, matched where possible and `NULL`-filled on the missing side.",
    misconception: "A full outer join returns only the rows that appear in both tables at once.",
    contrast: { with: "Right join", thisIs: "Keeps unmatched rows from both tables, not just one" },
  },

  // --- Data quality and shape (2026-06-23) ---
  {
    term: "Dirty data",
    definition: "Data that is messy or unreliable: missing values, duplicates, typos, wrong types or inconsistent formats.",
    misconception: "Data is only dirty when values are missing; inconsistent casing and typos do not count.",
    contrast: { with: "Clean data", thisIs: "Contains typos, duplicates, gaps or inconsistent formats" },
  },
  {
    term: "Clean data",
    definition: "Data that is consistent, complete and correctly formatted, so you can query it reliably.",
    contrast: { with: "Dirty data", thisIs: "Consistent, complete and correctly typed throughout" },
  },
  {
    term: "Structured data",
    definition: "Data organized into a fixed shape of rows and columns with a schema, easy to store and query with SQL.",
    contrast: { with: "Unstructured data", thisIs: "Fits a fixed schema of rows and columns" },
  },
  {
    term: "Unstructured data",
    definition: "Data with no predefined model, like free text, photos or audio, which does not fit neatly into tables.",
    misconception: "Unstructured data cannot be stored at all; only structured data can be saved.",
    contrast: { with: "Structured data", thisIs: "Free text, images or audio with no rows or columns" },
  },

  // --- Quoting, injection and defence (2026-06-23, 2026-06-24) ---
  {
    term: "Single quotes in SQL",
    definition: "Quotes that wrap a string value, the text data you are comparing against or inserting.",
    contrast: { with: "Double quotes in SQL", thisIs: "Wrap a text value such as `'dog'`" },
  },
  {
    term: "Double quotes in SQL",
    definition: "Quotes that wrap an identifier, meaning a table or column name, in standard SQL.",
    misconception: "Writing `WHERE name = \"Rex\"` compares against the text Rex in every database.",
    contrast: { with: "Single quotes in SQL", thisIs: "Wrap a table or column name, not text data" },
  },
  {
    term: "SQL injection",
    definition: "An attack where untrusted user input is glued into a query and then run as part of that query.",
    misconception: "The database can tell your query's code apart from a user's data, so injection cannot work.",
    contrast: { with: "Parameterized query", thisIs: "An attack where user input is executed as query code" },
  },
  {
    term: "Parameterized query",
    definition: "A query written with placeholders whose values are passed separately, so the database treats them as data, not code.",
    misconception: "A parameterized query is just string concatenation written with nicer syntax.",
    contrast: { with: "SQL injection", thisIs: "A defence that binds values to placeholders as data" },
  },

  // --- Database systems and tooling (2026-06-23) ---
  {
    term: "DBMS",
    definition: "The software that stores, organizes and manages a database, handling querying, concurrency, integrity and transactions.",
    misconception: "The DBMS and the database are the same thing: the software and the stored data are one.",
  },
  {
    term: "SQLite",
    definition: "A tiny relational database embedded as a single file, with no server, no users and one writer at a time.",
    misconception: "SQLite needs a server process running before your application can connect to it.",
    contrast: { with: "PostgreSQL", thisIs: "Embedded in one file, with no server to run" },
  },
  {
    term: "PostgreSQL",
    definition: "A powerful, standards-focused relational database that runs as a server, supporting many concurrent users and permissions.",
    misconception: "PostgreSQL stores a database as a single file you copy around, with no server to run.",
    contrast: { with: "SQLite", thisIs: "Client-server, with permissions and many concurrent writers" },
  },
  {
    term: "ORM",
    definition: "Object-Relational Mapping: a library that lets you query a database using your language's objects instead of raw SQL.",
    misconception: "An ORM removes SQL entirely, so no SQL is ever run against the database.",
  },

  // --- Table relationships (2026-06-24) ---
  {
    term: "One-to-one (1:1)",
    definition: "A relationship where each row in one table links to at most one row in the other, and vice versa.",
    misconception: "A one-to-one relationship is created just by adding a foreign key, with no `UNIQUE` constraint.",
    contrast: { with: "One-to-many (1:N)", thisIs: "Each side links to at most one row on the other" },
  },
  {
    term: "One-to-many (1:N)",
    definition: "A relationship where one row in a table links to many rows in another, but each of those links back to one.",
    misconception: "In a one-to-many relationship the foreign key belongs on the \"one\" side.",
    contrast: { with: "One-to-one (1:1)", thisIs: "One row on one side links to many on the other" },
  },
  {
    term: "Many-to-many (M:N)",
    definition: "A relationship where rows in each table link to many rows in the other, needing a third junction table to connect them.",
    misconception: "You can model many-to-many by putting a foreign key on each of the two tables.",
  },

  // --- Dumps and tunnels (2026-06-25) ---
  {
    term: "SQL dump",
    definition: "A file of SQL statements that can recreate a database: its schema, its data, or both.",
    misconception: "Restoring any dump safely replaces what is there, so it is always fine to restore onto existing tables.",
  },
  {
    term: "Tunnel",
    definition: "A connection that lets outside traffic reach a machine that normally cannot be reached directly, like a P.O. box.",
    misconception: "A server running on `localhost` is already reachable from other machines on the internet.",
  },
  {
    term: "ngrok",
    definition: "A ready-made tunnelling tool that gives your local server a public URL and forwards requests down to it.",
    misconception: "Exposing your server with ngrok deploys it, so it stays reachable once your laptop shuts down.",
  },
];

// ---------------------------------------------------------------------------
// Week 5 — Full-Stack Development
// Decks: 2026-06-29 … 07-02
// ---------------------------------------------------------------------------

const WEEK_5: VocabAtom[] = [
  // --- Versioning follow-ups (2026-06-29) ---
  {
    term: "Breaking change",
    definition: "A change in a new version of a tool that makes previously working code stop working or behave differently.",
    misconception: "New versions of a library only add things, so upgrading can never stop your existing code from working.",
    contrast: { with: "Semantic versioning", thisIs: "A change that makes previously working code stop working" },
  },
  {
    term: "Semantic versioning",
    definition: "The `MAJOR.MINOR.PATCH` numbering scheme, where each number signals what kind of change a release contains.",
    misconception: "A jump from `7.1` to `7.2` is just as likely to break your code as a jump from `6` to `7`.",
    contrast: { with: "Breaking change", thisIs: "A numbering scheme signalling what kind of change a release brings" },
  },

  // --- Modules follow-up (2026-06-29) ---
  {
    term: "CommonJS",
    definition: "Node's original module system for sharing code between files, written with `require(...)` and `module.exports`.",
    misconception: "CommonJS and ES Modules always mix cleanly, so a project never has to pick one.",
    contrast: { with: "ES Modules", thisIs: "Node's original system, using `require` and `module.exports`" },
  },
  {
    term: "ES Modules",
    definition: "The modern standard module system for JavaScript, written with `import` and `export` statements.",
    misconception: "ES Modules only work in browsers, so Node code still has to use `require`.",
    contrast: { with: "CommonJS", thisIs: "The ECMAScript standard, using `import` and `export`" },
  },

  // `Library` and `Framework` are deliberately NOT in this bank, though the week teaches them.
  // Their phrases were landing as distractors in Ionic questions ("Which describes Ionic, but not
  // Capacitor?" offering "Code you call when you want it, and can swap out"), which is arguable
  // rather than wrong — the decks call Ionic both. Week 2 carries the pair, contrast and
  // misconception intact, with no Ionic present to collide with.

  // --- Hybrid apps and Ionic (2026-06-29) ---
  {
    term: "Hybrid app",
    definition: "An app that shares most of its code across platforms, with only a thin platform-specific layer on top.",
    misconception: "A hybrid app performs just as well as a fully native one, so there is never a reason to go native.",
  },
  // Ionic is deliberately defined without classifying it as a library or a framework — the decks
  // call it both on the same slide, so that distinction is not askable. The Ionic/Capacitor pair
  // below draws the line the course is actually clear about: shared UI vs. native device access.
  {
    term: "Ionic",
    definition: "The toolkit used to build hybrid apps from web technology, shipping pre-built UI components for iOS, Android and web.",
    contrast: { with: "Capacitor", thisIs: "Pre-built UI components shared across iOS, Android and web" },
  },
  {
    term: "Capacitor",
    definition: "The layer Ionic uses to reach native device features such as the camera and device storage.",
    contrast: { with: "Ionic", thisIs: "The layer that reaches native device features like camera and storage" },
  },

  // --- Ionic CLI follow-up (2026-06-30) ---
  {
    term: "Yarn PnP",
    definition: "Yarn's strict module resolution, where a package may only import dependencies it has explicitly declared.",
    misconception: "Under Yarn PnP a package can import anything that happens to be installed somewhere in the project.",
  },

  // --- Pages, components, routing, props (2026-06-30) ---
  {
    term: "Page",
    definition: "One full-screen view in an app, usually one per route, that the router navigates between.",
    misconception: "A page is a fundamentally different kind of thing from a component, not a component itself.",
    contrast: { with: "Component", thisIs: "A whole screen the router navigates to, one per route" },
  },
  {
    term: "Component",
    definition: "A reusable piece of UI you write once and reuse across screens, configurable through the props it accepts.",
    contrast: { with: "Page", thisIs: "A reusable piece of UI placed inside a screen" },
  },
  {
    term: "Router",
    definition: "The part of an app that decides which page to show for a given URL and handles moving between pages.",
  },
  {
    term: "URL parameter",
    definition: "A part of a route path captured as a value, written with a colon like `:id`, so one page serves many records.",
    contrast: { with: "Props", thisIs: "A value captured from a segment of the URL, like `:id`" },
  },
  {
    term: "Props",
    definition: "The inputs passed into a component by its parent, like arguments to a function or attributes on an HTML tag.",
    contrast: { with: "URL parameter", thisIs: "Values handed down to a component by its parent" },
  },

  // --- Forms and state (2026-06-30, revisited 2026-07-01) ---
  {
    term: "React Hook Form",
    definition: "A React library that registers your inputs through a hook and handles their values, validation and submission.",
    misconception: "React Hook Form still needs a `useState` and an `onChange` wired up for every single field.",
  },
  {
    term: "State variable",
    definition: "A value a component remembers between renders; changing it makes React re-render the component with the new value.",
    misconception: "Changing a state variable updates the stored value but does not cause the component to re-render.",
  },
  {
    term: "Array destructuring",
    definition: "Unpacking the entries of an array into named variables in one line, as in `const [count, setCount] = useState(0)`.",
    misconception: "The names in `const [count, setCount] = useState(0)` are fixed by React and cannot be chosen by you.",
  },

  // --- git branching (2026-06-30) ---
  {
    term: "Branch",
    definition: "A separate line of work in a repository that you can commit to without touching `main`, then merge back later.",
    misconception: "Committing on a branch also changes `main`, so branches cannot really keep work isolated.",
  },

  // --- TypeScript (2026-07-01) ---
  {
    term: "Type alias",
    definition: "A named shape you define with the `type` keyword and reuse, instead of writing the same annotation inline.",
    contrast: { with: "Interface", thisIs: "A named shape that can also express unions and other combinations" },
  },
  {
    term: "Interface",
    definition: "A named object shape declared with the `interface` keyword, the recommended choice for plain object shapes.",
    contrast: { with: "Type alias", thisIs: "Declared with the `interface` keyword, for object shapes only" },
  },
  {
    term: "Escape hatch",
    definition: "A way to switch off TypeScript checking, such as `any`, `@ts-ignore` or `@ts-nocheck`, meant only as a temporary measure.",
    misconception: "Marking a value `any` or adding `@ts-ignore` fixes the underlying problem the type checker found.",
  },

  // --- TanStack Query (2026-07-01, 2026-07-02) ---
  {
    term: "TanStack Query",
    definition: "A React library that manages server data for you, handling caching, background refetching, loading and error states.",
    misconception: "TanStack Query replaces `useState` for all of a component's data, including values that never come from a server.",
  },
  {
    term: "QueryClientProvider",
    definition: "The wrapper placed at the top of an app that shares one `QueryClient`, and its cache, with every component below.",
    misconception: "`useQuery` and `useMutation` work fine on their own, without a provider anywhere above them.",
  },
  {
    term: "useQuery",
    definition: "The hook that reads server data, returning `data`, `isLoading` and `error` and re-rendering as they change.",
    contrast: { with: "useMutation", thisIs: "Reads data and runs on its own when the component renders" },
  },
  {
    term: "useMutation",
    definition: "The hook that changes server data with `POST`, `PUT` or `DELETE`, tracking `isPending`, `error` and `onSuccess`.",
    misconception: "A mutation fires by itself as soon as the component renders, just like a query does.",
    contrast: { with: "useQuery", thisIs: "Changes data, and only runs when you call `mutate(...)`" },
  },

  // --- Client-server communication models (2026-07-01) ---
  {
    term: "Regular requests",
    definition: "The classic model where the client asks the server for data and the server responds, only when the user acts.",
    contrast: { with: "Polling", thisIs: "Nothing is fetched unless the user does something first" },
  },
  {
    term: "Polling",
    definition: "Having the client re-ask the server on a timer, checking for new data whether or not anything has changed.",
    misconception: "Polling gives you true real-time updates, since the server pushes as soon as data changes.",
    contrast: { with: "WebSocket", thisIs: "The client re-asks on a timer; the server cannot push" },
  },
  {
    term: "WebSocket",
    definition: "A single persistent connection that stays open, letting either side send a message at any time.",
    misconception: "A WebSocket opens a fresh connection for each message, the way a normal request does.",
    contrast: { with: "Polling", thisIs: "One open connection where the server can push instantly" },
  },

  // --- Full-stack (2026-07-02) ---
  {
    term: "Full-stack",
    definition: "Working across all three layers of a web app: the frontend UI, the backend server and APIs, and the database.",
    misconception: "A full-stack developer is automatically as deep in every layer as a specialist is in one.",
  },
];

// ---------------------------------------------------------------------------
// Week 6 — Data Analytics
// Decks: 2026-07-06 … 07-09
// ---------------------------------------------------------------------------

const WEEK_6: VocabAtom[] = [
  // --- Purpose of data analytics; R vs. Python; sharing data (2026-07-06) ---
  {
    term: "Data analytics",
    definition: "The practice of studying what has already happened to find patterns, then using them to guide future decisions.",
    misconception: "Data analytics only describes the past; predicting what happens next is a separate field entirely.",
  },
  {
    term: "R",
    definition: "A language created in academia by statisticians for statistical computing, strongest at statistics and visualization.",
    contrast: { with: "Python", thisIs: "Built for statistics; at home in academia and research" },
  },
  {
    term: "Python",
    definition: "A general-purpose language that grew into data work, covering analysis, machine learning, automation, and web.",
    misconception: "Python has fully replaced R, so R is no longer used professionally anywhere.",
    contrast: { with: "R", thisIs: "One general-purpose language from data cleaning to shipped app" },
  },
  {
    term: "CSV",
    definition: "A plain-text, language-agnostic table format used as an intermediary for handing data between tools and teammates.",
    misconception: "A CSV preserves each column's type, so dates and numbers load back exactly as they were saved.",
  },

  // --- EDA, notebooks, and scripts (2026-07-06) ---
  {
    term: "Exploratory data analysis (EDA)",
    definition: "Your first, open-ended look at a dataset: summarize it, visualize it, and question it before drawing conclusions.",
    misconception: "EDA is a one-time step you finish before the real analysis, never something you loop back to.",
  },
  {
    term: "Jupyter notebook",
    definition: "A document of cells you run one at a time in any order, keeping state in memory between runs.",
    misconception: "Because the cells sit in order on the page, a notebook always runs top to bottom like a script.",
    contrast: { with: "Python script", thisIs: "Cells run in any order and share state in memory" },
  },
  {
    term: "Python script",
    definition: "A `.py` file that runs top to bottom, start to finish, every time you run it.",
    contrast: { with: "Jupyter notebook", thisIs: "Sequential execution of the whole file in one pass" },
  },

  // --- pandas, NumPy, and the DataFrame (2026-07-06) ---
  {
    term: "pandas",
    definition: "The standard Python library for tabular data: loading, cleaning, filtering, grouping, joining, and summarizing rows and columns.",
  },
  {
    term: "DataFrame",
    definition: "pandas' core type: a 2-D labeled table where each column has a name and each row an index.",
    misconception: "To filter or sum a DataFrame you have to write a loop over its rows.",
    contrast: { with: "NumPy `ndarray`", thisIs: "A labeled table whose columns may each hold a different type" },
  },
  {
    term: "NumPy `ndarray`",
    definition: "NumPy's fast, fixed-type n-dimensional array, operated on all at once in C code rather than Python loops.",
    contrast: { with: "DataFrame", thisIs: "One fixed type across the entire n-dimensional array" },
  },
  {
    term: "Data dictionary",
    definition: "A document describing a dataset's columns: what each means, its type, allowed values, and how codes are built.",
    misconception: "Every dataset ships with a data dictionary, so you never have to infer what a column means.",
  },

  // --- Dirty vs. clean data; wrangling (2026-07-07) ---
  {
    term: "Dirty data",
    definition: "Data carrying missing values, inconsistent formats, duplicates, wrong types, and outliers that you cannot yet trust.",
    misconception: "Most real-world datasets arrive tidy enough to analyze the moment you load them.",
    contrast: { with: "Clean data", thisIs: "Still holds blanks, duplicates, and mistyped columns" },
  },
  {
    term: "Clean data",
    definition: "Data that is consistent, correctly typed, de-duplicated, and ready to analyze without further repair.",
    contrast: { with: "Dirty data", thisIs: "Consistent and correctly typed, ready to analyze as-is" },
  },
  {
    term: "Data wrangling",
    definition: "The umbrella term, also called munging, for turning raw messy data into a usable form.",
    contrast: { with: "Data cleaning", thisIs: "The whole umbrella, including transforming and combining sources" },
  },
  {
    term: "Data cleaning",
    definition: "The wrangling step that fixes missing values, duplicates, wrong types, bad formats, outliers, and unclear column names.",
    misconception: "Cleaning a dataset has one correct answer, so any two analysts end up with the same result.",
    contrast: { with: "Data wrangling", thisIs: "Only repairing errors, not reshaping or joining tables" },
  },
  {
    term: "Outlier",
    definition: "An extreme or impossible value, such as a negative age, that can distort averages and models.",
    misconception: "An outlier is by definition a data error, so it should always be removed before analysis.",
  },

  // --- Follow Up: standard deviation and quartiles (2026-07-08) ---
  {
    term: "Standard deviation",
    definition: "The typical distance of a value from the mean, written σ and expressed in the data's own units.",
    misconception: "Two datasets that share a mean and a standard deviation must have the same shape.",
    contrast: { with: "Quartiles", thisIs: "One number for spread measured as distance from the mean" },
  },
  {
    term: "Quartiles",
    definition: "Three cut points that split sorted data into four equal parts: the 25th, 50th, and 75th percentiles.",
    misconception: "The quartiles chop the range from smallest to largest value into four equally wide intervals.",
    contrast: { with: "Standard deviation", thisIs: "Describes spread by position, so outliers barely move it" },
  },
  {
    term: "The 68-95-99.7 rule",
    definition: "For bell-shaped data, roughly 68%, 95%, and 99.7% of values fall within one, two, and three σ of the mean.",
    misconception: "About 68% of values fall within one standard deviation of the mean in any dataset at all.",
  },
  {
    term: "Interquartile range (IQR)",
    definition: "Q3 minus Q1: a single number giving the spread of the middle 50% of the data.",
    contrast: { with: "Quartiles", thisIs: "A single width, not the three cut points themselves" },
  },

  // --- Pythonic code; transforming and combining (2026-07-08) ---
  {
    term: "Pythonic",
    definition: "Code written the one clear, obvious way Python favors, leaning on built-in features instead of reinventing them.",
    misconception: "Pythonic means the shortest and cleverest version of the code you can manage to write.",
  },
  {
    term: "Binning",
    definition: "Grouping a continuous number into a few labeled buckets, such as ages into child, adult, and senior.",
    misconception: "Binning is lossless, so you can always recover the exact original values from the bin labels.",
    contrast: { with: "Merging", thisIs: "Collapses one continuous column into labeled categories" },
  },
  {
    term: "Merging",
    definition: "Combining two DataFrames by matching rows on a shared key column, just like a SQL join.",
    misconception: "An inner merge keeps every row from both tables, whether or not the keys match.",
    contrast: { with: "Binning", thisIs: "Pulls columns in from a second table on a shared key" },
  },
  {
    term: "Garden of forking paths",
    definition: "Andrew Gelman's idea that an honest analyst's branching maze of reasonable choices can itself manufacture a striking finding.",
    misconception: "As long as an analyst is honest and runs only one analysis, the result cannot be an artifact of their choices.",
  },

  // --- groupby, sovereignty, PII, and collecting data (2026-07-09) ---
  {
    term: "Split-apply-combine",
    definition: "The `groupby` pattern: split rows into groups, apply a calculation to each, combine into one row per group.",
    misconception: "`groupby` edits the original DataFrame in place rather than returning a new table.",
  },
  {
    term: "Data sovereignty",
    definition: "The belief, treated as a human right, that people should have authority over data about themselves.",
    misconception: "Once you have lawfully collected someone's data, it is yours to use however you like.",
  },
  {
    term: "Personally Identifiable Information (PII)",
    definition: "Any data that can identify a specific person, either on its own or combined with other data.",
    misconception: "Data counts as PII only when it contains something like a name or Social Security number.",
  },
  {
    term: "Direct identifier",
    definition: "A piece of data that singles out one person by itself, such as a name, SSN, email, or phone number.",
    contrast: { with: "Indirect identifier", thisIs: "Points to one person entirely on its own" },
  },
  {
    term: "Indirect identifier",
    definition: "A piece of data that identifies someone only in combination with others, such as ZIP code, birth date, or gender.",
    misconception: "A ZIP code is not personal data, so publishing it alongside birth dates is safe.",
    contrast: { with: "Direct identifier", thisIs: "Harmless alone, but pinpoints a person in combination" },
  },
  {
    term: "Anonymize",
    definition: "Removing or masking identifiers for good, so that no one in the dataset can be re-identified.",
    misconception: "You can always recover the original values from anonymized data if you kept the key.",
    contrast: { with: "Pseudonymize", thisIs: "Irreversible: the original identifier is gone for good" },
  },
  {
    term: "Pseudonymize",
    definition: "Swapping an identifier for a consistent stand-in, often a salted hash, so records still link while the person is hidden.",
    misconception: "Hashing an email makes the data anonymous, so GDPR no longer treats it as personal data.",
    contrast: { with: "Anonymize", thisIs: "Records still link to one person through a stand-in value" },
  },
  {
    term: "Web scraping",
    definition: "Collecting data by pulling it off public web pages, typically when a site offers no official API.",
    misconception: "If a page is publicly visible, its content is legally free to take and reuse.",
  },
];

// ---------------------------------------------------------------------------
// Week 7 — Data Visualization
// Decks: 2026-07-13 … 07-16
// ---------------------------------------------------------------------------

const WEEK_7: VocabAtom[] = [
  // --- Meet seaborn / Aside: Built on matplotlib (2026-07-13) ---
  {
    term: "seaborn",
    definition:
      "A Python library for statistical charts that plots pandas DataFrame columns by name in a line or two.",
    misconception:
      "seaborn draws its charts itself, so it works with no other plotting library underneath it.",
    contrast: {
      with: "matplotlib",
      thisIs: "Good-looking charts from smart defaults and little code",
    },
  },
  {
    term: "matplotlib",
    definition:
      "Python's foundational plotting library: powerful but low-level and verbose, and the engine every seaborn chart really uses.",
    misconception:
      "Once you know seaborn there is no reason to touch matplotlib, because seaborn exposes every knob.",
    contrast: {
      with: "seaborn",
      thisIs: "The low-level layer you drop into for total control",
    },
  },

  // --- A Tour of seaborn Plots (2026-07-13) ---
  {
    term: "Histogram",
    definition:
      "A chart of one numeric variable's distribution, drawn as bars, showing where values fall and whether they are skewed.",
    misconception:
      "A histogram shows the relationship between two variables, one on each axis.",
    contrast: {
      with: "Density plot (KDE)",
      thisIs: "Bars counting how many values fall in each range",
    },
  },
  {
    term: "Density plot (KDE)",
    definition:
      "A smooth curve of one numeric variable's distribution, showing its overall shape and where the data is most concentrated.",
    contrast: {
      with: "Histogram",
      thisIs: "A smoothed curve of the distribution rather than bars",
    },
  },
  {
    term: "Box plot",
    definition:
      "A compact per-group summary of a distribution's median, spread, and outliers, drawn so groups can be compared side by side.",
    misconception:
      "A box plot shows the full shape of each group, so you can spot a group with two separate peaks in it.",
    contrast: {
      with: "Violin plot",
      thisIs: "A compact summary of median, spread, and outliers",
    },
  },
  {
    term: "Violin plot",
    definition:
      "A per-group plot of each group's full distribution shape, showing whether a group is bunched, spread out, or bimodal.",
    contrast: {
      with: "Box plot",
      thisIs: "The full distribution shape, including multiple peaks",
    },
  },

  // --- Follow Up: Plot, Chart, Graph, Visualization (2026-07-14) ---
  {
    term: "Plot",
    definition:
      "The technical term for data drawn on a set of axes, whatever the chart type.",
    misconception:
      "\"Plot\" and \"graph\" are perfectly safe synonyms in any technical setting.",
    contrast: {
      with: "Chart",
      thisIs: "The technical term for data drawn on axes",
    },
  },
  {
    term: "Chart",
    definition:
      "The communication term for a plot dressed up for an audience, styled and labelled so it makes its point.",
    contrast: {
      with: "Plot",
      thisIs: "A plot styled and presented for an audience",
    },
  },
  {
    term: "Graph",
    definition:
      "An everyday synonym for a plot, but ambiguous: in math and computer science a graph is a network of nodes and edges.",
    misconception:
      "To an engineer, \"graph\" clearly means a picture of data drawn on axes.",
    contrast: {
      with: "Plot",
      thisIs: "A word that can also mean a network of nodes and edges",
    },
  },

  // --- Follow Up: What Is df.corr()? / Reading a Correlation (2026-07-14) ---
  {
    term: "Correlation coefficient (r)",
    definition:
      "A number from -1 to +1 measuring how closely two variables move together, with the sign giving the direction.",
    misconception:
      "A strong correlation between two variables shows that one of them causes the other.",
    contrast: {
      with: "R-squared",
      thisIs: "A signed measure of how two variables move together",
    },
  },

  // --- Wide Data and Long Data (2026-07-14) ---
  {
    term: "Wide data",
    definition:
      "A table with one row per thing and each measurement in its own column, the familiar spreadsheet or report shape.",
    misconception:
      "Wide and long tables hold different information, so reshaping between them changes the numbers.",
    contrast: {
      with: "Long data",
      thisIs: "One row per thing, measurements spread across columns",
    },
  },
  {
    term: "Long data",
    definition:
      "A table with one row per observation, where a variable's name and its value each get their own column.",
    misconception:
      "Long data is a messy shape you should widen before plotting it with seaborn.",
    contrast: {
      with: "Wide data",
      thisIs: "One row per observation, the shape seaborn plots from",
    },
  },
  {
    term: "`melt()`",
    definition:
      "The pandas method that turns wide data long, melting the old column headers down into rows of data.",
    contrast: {
      with: "`pivot()`",
      thisIs: "Turns old column headers into values in a new column",
    },
  },
  {
    term: "`pivot()`",
    definition:
      "The pandas method that turns long data wide, pivoting one column's values up into new column headers.",
    misconception:
      "`pivot()` widens any long table, even when the same key appears in more than one row.",
    contrast: {
      with: "`melt()`",
      thisIs: "Turns a column's values into new column headers",
    },
  },

  // --- Follow Up: Copying a DataFrame (2026-07-15) ---
  {
    term: "Copy by reference",
    definition:
      "Plain assignment of a DataFrame, which makes a second name for one object, so an edit through either name shows in both.",
    misconception:
      "Writing `df2 = df` gives you a separate DataFrame you can edit without touching the original.",
    contrast: {
      with: "Copy by value",
      thisIs: "Two names pointing at one and the same object",
    },
  },
  {
    term: "Copy by value",
    definition:
      "Duplicating a DataFrame with `.copy()`, producing an independent object whose edits leave the original untouched.",
    contrast: {
      with: "Copy by reference",
      thisIs: "An independent duplicate that edits cannot leak out of",
    },
  },

  // --- Follow Up: Absolute Numbers Can Mislead (2026-07-15) ---
  {
    term: "Raw count",
    definition:
      "A tally of how many rows fall in each group, which mostly reflects how large each group is.",
    misconception:
      "The neighborhood with the most 311 complaints is the neighborhood with the worst problems.",
    contrast: {
      with: "Rate",
      thisIs: "Answers \"how many?\" and tracks group size",
    },
  },
  {
    term: "Rate",
    definition:
      "A count divided by the size of its group, such as accidents per 100,000 residents, so groups compare fairly.",
    contrast: {
      with: "Raw count",
      thisIs: "Answers \"how risky?\" by dividing out group size",
    },
  },

  // --- Follow Up: Disaggregation (2026-07-15) ---
  {
    term: "Disaggregation",
    definition:
      "Breaking a total apart into meaningful subgroups, such as by age or borough, instead of reporting one number.",
    misconception:
      "If the citywide total is flat, then nothing is changing in any of the groups inside it.",
  },

  // --- Reports and Dashboards (2026-07-15) ---
  {
    term: "Report",
    definition:
      "A fixed, curated deliverable that tells one story start to finish, like a paper, notebook, or slide deck.",
    misconception:
      "A dashboard and a report are the same deliverable with different names.",
    contrast: {
      with: "Dashboard",
      thisIs: "A fixed narrative in which you steer the reader",
    },
  },
  {
    term: "Dashboard",
    definition:
      "An interactive, filterable view that stays current with the data and lets the reader explore along their own path.",
    misconception:
      "A dashboard is done once you build it, since there is nothing left to maintain afterwards.",
    contrast: {
      with: "Report",
      thisIs: "An interactive view the reader drives, refreshing with the data",
    },
  },

  // --- Meet Plotly (2026-07-15) / Introducing Recharts (2026-07-16) ---
  {
    term: "Plotly",
    definition:
      "A library whose charts are interactive by default, with `plotly.express` giving seaborn-style one-liners in Python.",
    contrast: {
      with: "Recharts",
      thisIs: "One Python function call over a DataFrame",
    },
  },
  {
    term: "Recharts",
    definition:
      "A React charting library where a chart is composed from components, built for interactive dashboards shipped inside a web app.",
    misconception:
      "Recharts is just Plotly for JavaScript, so you build a chart with a single function call.",
    contrast: {
      with: "Plotly",
      thisIs: "Composed React components over an array of objects",
    },
  },

  // --- Machine learning and prediction (2026-07-16) ---
  {
    term: "Machine learning",
    definition:
      "An approach where a program learns the rule from example data instead of you hard coding the rules yourself.",
    misconception:
      "Machine learning removes the need to clean your data, since the model sorts out the mess itself.",
  },
  {
    term: "Linear regression",
    definition:
      "A model that fits the best straight line through the data and reads a numeric prediction off that line.",
    misconception:
      "Linear regression refuses to predict in the blank space where you have no data.",
  },
  {
    term: "Feature",
    definition:
      "An input variable you already know and hand to a model, also called an independent variable.",
    misconception:
      "Every column you have is worth adding as a feature, because more inputs can only help the model.",
    contrast: {
      with: "Target",
      thisIs: "A known input the prediction is made from",
    },
  },
  {
    term: "Target",
    definition:
      "The answer you want the model to produce, which depends on the features, also called the dependent variable.",
    contrast: {
      with: "Feature",
      thisIs: "The value being predicted, which depends on the inputs",
    },
  },
  {
    term: "Coefficient",
    definition:
      "The slope a fitted model learned: how much the target moves for a one unit increase in that feature.",
    misconception:
      "The feature with the largest coefficient always has the strongest effect on the target.",
    contrast: {
      with: "Intercept",
      thisIs: "How much the target moves per unit of one feature",
    },
  },
  {
    term: "Intercept",
    definition:
      "The baseline a fitted model starts from: its prediction when every feature is zero, often not a real case.",
    contrast: {
      with: "Coefficient",
      thisIs: "The prediction made when every feature equals zero",
    },
  },
  {
    term: "R-squared",
    definition:
      "A score from 0 to 1 giving the share of the target's variation that a model explains, where 1 is a perfect fit.",
    misconception:
      "A high R-squared proves that the model is right.",
    contrast: {
      with: "Correlation coefficient (r)",
      thisIs: "A 0 to 1 score of variation a model explains",
    },
  },
];

/** A week's module. `subjects` and `bank` are the same list: these do not split by level. */
function weekModule(week: number, theme: string, short: string, atoms: VocabAtom[]): QuestionModule {
  return makeVocabModule(
    `course-week-${week}`,
    `Week ${week} · ${theme}`,
    `Wk${week} · ${short}`,
    `Vocabulary from Week ${week} of the bootcamp — ${theme.toLowerCase()}.`,
    atoms,
    atoms,
    // No "red flags" here. That archetype asks a student to pick the *false* statement, with the
    // term's own correct definition sitting there as a distractor — a recognition trap that suits
    // interview prep but not lecture review. The `misconception` field stays on the atoms below;
    // it is simply unused by these modules for now.
    { exclude: ["redflag"] },
  );
}

export const courseWeek1 = weekModule(1, "Environment Setup and Developer Foundations", "Setup", WEEK_1);
export const courseWeek2 = weekModule(2, "Web and JavaScript in Professional Practice", "Web/JS", WEEK_2);
export const courseWeek3 = weekModule(3, "APIs, Data and Backend Foundations", "APIs", WEEK_3);
export const courseWeek4 = weekModule(4, "Databases and SQL", "SQL", WEEK_4);
export const courseWeek5 = weekModule(5, "Full-Stack Development", "Full-stack", WEEK_5);
export const courseWeek6 = weekModule(6, "Data Analytics", "Analytics", WEEK_6);
export const courseWeek7 = weekModule(7, "Data Visualization", "Dataviz", WEEK_7);

export const COURSE_VOCAB_MODULES: readonly QuestionModule[] = [
  courseWeek1,
  courseWeek2,
  courseWeek3,
  courseWeek4,
  courseWeek5,
  courseWeek6,
  courseWeek7,
];
