# Membean

The ultimate MemBean client API for all your training needs!

## Introduction

This package is a versatile Node.js library designed to interact with the MemBean training platform, providing comprehensive access to training sessions, quizzes, spell tests, and more.

## Installation

You can install MemBeanTrainingSession via npm:

```bash
npm install membean
```

## Usage

Here's a quick guide on how to get started with Membean:

```javascript
import MemBeanTrainingSession from 'membean';

// Initialize the session with your session ID and authentication token
const session = new MemBeanTrainingSession(sessionId, authToken);

// Listen to events emitted by the session
session.on('new_word', (data) => {
    console.log('New word:', data.word);
    // Handle new word event
});

// Start parsing user state and interacting with the session
session.parseUserState();
```

For more, see the [documentation](https://membean.js.org)

## Features

- **Event-driven Architecture**: Utilize event listeners to react to different states during the training session.
- **Advanced Parsing**: Parse detailed information about word learning, quizzes, spell tests, and more.
- **Flexible Advancement**: Seamlessly advance through the training session with customizable time spent on each page.
- **Internal Methods**: Access internal methods for advanced session manipulation.

## Documentation

### Classes

#### MemBeanTrainingSession

The main class representing a MemBean training session.

##### Events

- `new_word`: Emitted when a new word is encountered.
- `restudy`: Emitted when a word is being restudied.
- `quiz`: Emitted during a quiz session.
- `spelltest`: Emitted during a spell test session.
- `take_a_break`: Emitted when it's time to take a break.

##### Methods

- `advance(advancement, timeOnPage)`: Advance the training session. Params: `advancement` (internal advancement object), `timeOnPage` (time spent on page in seconds).
- `_int_advance(event, barrier, args)`: Internal method for advancing the session.
- `parseUserState()`: Parse the user state.
- `_parseUserState(res)`: Internal method for parsing the user state.
- `parseWordLearn($, type)`: Parse word learning data.
- `parseQuiz($)`: Parse quiz data.
- `parseSpellCheck($)`: Parse spell test data.
- `parseTakeABreak($)`: Parse take a break data and terminate session.

## Contributions

Contributions are welcome! Feel free to submit issues or pull requests on [GitHub](https://github.com/redyetidev/membean).

## License

This project is licensed under the Creative Commons Attribution 4.0 International License - see the [LICENSE](LICENSE.md) file for details.

## Author

Written with ❤️ by Aviv Keller <redyetidev@gmail.com>.
