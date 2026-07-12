export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends Error {
  constructor(message = 'Too Many Requests') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends Error {
  constructor(message = 'Bad Request') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UpstreamAiError extends Error {
  constructor(message = 'Bad Gateway') {
    super(message);
    this.name = 'UpstreamAiError';
  }
}
