# Contributing to LocalBeam

Thanks for your interest in contributing! LocalBeam is a simple, focused tool — contributions that keep it simple are most welcome.

---

## Ways to Contribute

- **Bug reports** — open an issue with steps to reproduce
- **Feature requests** — open an issue describing the use case
- **Pull requests** — fixes, improvements, new platform support

---

## Getting Started

```bash
git clone https://github.com/YOUR_USERNAME/localbeam.git
cd localbeam
npm install
node server.js
```

Then open `http://localhost:3000` in your browser and connect your phone to the same WiFi.

---

## Pull Request Guidelines

1. Fork the repository and create a branch from `main`.
2. Keep changes focused — one fix or feature per PR.
3. Test on Linux before submitting.
4. Update the README if behaviour or setup instructions change.
5. Write clear commit messages (`fix: prevent duplicate text entries`, `feat: add dark mode toggle`).

---

## Code Style

- Plain JavaScript — no TypeScript compilation step required
- 2-space indentation
- No external UI frameworks — keep the frontend vanilla HTML/CSS/JS
- Keep the server self-contained in `server.js`

---

## Reporting Bugs

Open a GitHub issue and include:

- Your OS and Node.js version (`node --version`)
- Steps to reproduce
- What you expected vs what happened
- Any terminal error output

---

## License

By contributing, you agree your contributions will be licensed under the [MIT License](LICENSE).
