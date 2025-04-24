# Contributing to rfxcom2mqtt

Thank you for your interest in contributing to the rfxcom2mqtt project! This document provides guidelines and instructions for contributing.

## Code Contributions

If you want to contribute to the rfxcom2mqtt project, please follow these steps:

1. **Fork the repository** on GitHub
2. **Clone your fork** to your local machine
   ```bash
   git clone https://github.com/yourusername/rfxcom2mqtt.git
   cd rfxcom2mqtt
   ```
3. **Create a new branch** for your feature or bugfix
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** and commit them with descriptive commit messages
   ```bash
   git commit -m "Add feature: your feature description"
   ```
5. **Push your changes** to your fork
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Create a Pull Request** from your fork to the main repository

## Coding Standards

- Follow the existing code style in the project
- Write tests for your code when applicable
- Update documentation to reflect your changes
- Make sure your code passes all existing tests

## Development Environment Setup

1. Make sure you have Node.js 18.18 or higher installed
   ```bash
   nvm install 18.18
   nvm use 18.18
   ```

2. Install the required dependencies
   ```bash
   npm install
   npm install -g typescript
   npm install -g ts-node
   ```

3. Run the project in development mode
   ```bash
   npm run dev
   ```

## Testing

Before submitting a pull request, make sure your changes pass all tests:

```bash
npm test
```

For more detailed test coverage:

```bash
npm run test:coverage
```

## Reporting Issues

If you find a bug or have a feature request, please create an issue on the GitHub repository with the following information:

- A clear and descriptive title
- A detailed description of the issue or feature request
- Steps to reproduce the issue (for bugs)
- Expected behavior and actual behavior (for bugs)
- Screenshots or logs if applicable
- Environment information (OS, Node.js version, etc.)

## Documentation Contributions

Improvements to documentation are always welcome:

- Fix typos or clarify existing documentation
- Add examples or use cases
- Improve diagrams or visual aids
- Translate documentation to other languages

## Pull Request Process

1. Update the README.md or documentation with details of changes if applicable
2. Update the version number in package.json following [Semantic Versioning](https://semver.org/)
3. The pull request will be merged once it has been reviewed and approved by a maintainer

## Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project, you agree to abide by its terms.

Thank you for contributing to the rfxcom2mqtt project!
