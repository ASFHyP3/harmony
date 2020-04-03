/* eslint-disable max-classes-per-file */ // This file creates multiple tag classes

class HttpError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// Class for errors returned by the CMR
class CmrError extends HttpError {}

// Tag class for backend errors
class ServiceError extends HttpError {}

class NotFoundError extends HttpError {
  constructor(message = 'The requested resource could not be found') {
    super(404, message);
  }
}

class ForbiddenError extends HttpError {
  constructor(message = 'You are not authorized to access the requested resource') {
    super(403, message);
  }
}

class ServerError extends HttpError {
  constructor(message = 'An unexpected error occurred') {
    super(500, message);
  }
}

class RequestValidationError extends HttpError {
  constructor(message = 'Invalid request') {
    super(400, message);
  }
}

class InvalidFormatError extends HttpError {
  constructor(formats) {
    super(404, `Could not find a service to reformat to any of the requested formats [${formats}] for the given collection`);
  }
}

module.exports = {
  HttpError,
  CmrError,
  ServiceError,
  NotFoundError,
  ServerError,
  RequestValidationError,
  ForbiddenError,
  InvalidFormatError,
};
