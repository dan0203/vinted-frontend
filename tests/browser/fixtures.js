// A 1x1 PNG served in place of the fixture image urls, which do not exist.
// Both pages fall back to a placeholder when an image fails to load, so letting
// a fixture url 404 would silently defeat any assertion about a rendered image.
// A test that wants a failure aborts its own url, which takes precedence over
// the stub registered before it.
export const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
);
