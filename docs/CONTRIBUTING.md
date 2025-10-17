# Contributing to SkateStock

Thank you for your interest in contributing to SkateStock! This document provides guidelines and information to help make the contribution process smooth and effective.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We are committed to providing a welcoming and inclusive environment for all contributors.

## How to Contribute

### Reporting Issues

If you find a bug or have a feature request:

1. Check if the issue already exists in our [GitHub Issues](https://github.com/alviarm/skatestock/issues)
2. If not, create a new issue with:
   - A clear, descriptive title
   - Detailed steps to reproduce the issue (for bugs)
   - Expected vs. actual behavior
   - Screenshots or code examples when helpful

### Suggesting Features

We welcome feature suggestions! Please:

1. Check existing issues and feature requests
2. Create a new issue describing:
   - The problem your feature would solve
   - How your feature would work
   - Any implementation ideas you have

### Code Contributions

#### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/skatestock.git
   cd skatestock
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Code Standards

- Follow existing code style and conventions
- Write clear, descriptive commit messages
- Include tests for new functionality
- Update documentation as needed
- Ensure all tests pass before submitting

#### Testing

Before submitting your contribution:

1. Run all tests:
   ```bash
   npm test
   ```
2. Ensure your code passes linting:
   ```bash
   npm run lint
   ```
3. Test the application locally:
   ```bash
   npm run dev
   ```

#### Submitting Pull Requests

1. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a pull request to the main repository
3. Include:
   - A clear description of the changes
   - Reference to any related issues
   - Screenshots or demos for UI changes

## Development Guidelines

### Project Structure

```
skatestock/
├── src/
│   ├── scrapers/        # Web scraping modules
│   ├── utils/           # Utility functions
│   └── app/             # Next.js application
│       ├── api/         # API routes
│       └── components/  # React components
├── __tests__/           # Test files
├── docs/                # Documentation
└── public/              # Static assets
```

### Adding New Scrapers

To add support for a new skate shop:

1. Create a new scraper file in `src/scrapers/`
2. Follow the existing patterns in other scraper files
3. Add the scraper to the `SCRAPERS` array in `src/scrapers/index.js`
4. Update documentation as needed

### Data Validation

All scraped data should pass through the validation utilities in `src/utils/dataValidation.js` to ensure consistency.

### API Development

API routes should:

- Handle errors gracefully
- Return appropriate HTTP status codes
- Include pagination for large datasets
- Follow RESTful conventions

## Community

### Communication

- Join our discussions on GitHub
- Be respectful and constructive in all interactions
- Help others who are contributing or using the project

### Recognition

Contributors will be recognized in:

- Git commit history
- GitHub contributors list
- Project documentation

## Questions?

If you have any questions about contributing, feel free to:

- Open an issue for discussion
- Contact the maintainers directly

Thank you for helping make SkateStock better!
