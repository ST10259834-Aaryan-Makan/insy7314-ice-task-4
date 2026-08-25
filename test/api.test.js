const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { app } = require('../server');
const User = require('../models/User');
const Photo = require('../models/Photo');

const request = async (baseUrl, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  return { response, body };
};

test('schemas apply safe defaults and exclude password hashes', async () => {
  const user = new User({
    username: 'Test User',
    email: 'UPPERCASE@EXAMPLE.COM',
    password: 'a-hash-for-schema-testing',
  });
  await user.validate();

  assert.equal(user.email, 'uppercase@example.com');
  assert.equal(user.role, 'user');
  assert.equal(Object.hasOwn(user.toJSON(), 'password'), false);

  const invalidPhoto = new Photo({ description: 'Missing required fields' });
  await assert.rejects(
    invalidPhoto.validate(),
    (error) => error.name === 'ValidationError' && Boolean(error.errors.title)
  );
});

test('API routes, JSON errors, authentication and authorization smoke checks', async (t) => {
  const originalFindById = User.findById;
  const originalUserFind = User.find;
  const originalPhotoFind = Photo.find;
  let role = 'user';

  User.findById = async () =>
    new User({
      _id: '507f191e810c19729de860ea',
      username: 'Mock User',
      email: 'mock@example.com',
      password: 'not-returned',
      role,
    });
  User.find = () => ({
    sort: async () => [
      new User({
        username: 'Safe User',
        email: 'safe@example.com',
        password: 'not-returned',
      }),
    ],
  });
  Photo.find = () => ({
    populate: () => ({ sort: async () => [] }),
  });

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const token = jwt.sign(
    { userId: '507f191e810c19729de860ea', role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  const auth = { Authorization: `Bearer ${token}` };

  t.after(async () => {
    User.findById = originalFindById;
    User.find = originalUserFind;
    Photo.find = originalPhotoFind;
    await new Promise((resolve) => server.close(resolve));
  });

  let result = await request(baseUrl, '/');
  assert.equal(result.response.status, 200);

  result = await request(baseUrl, '/not-a-route');
  assert.equal(result.response.status, 404);

  result = await request(baseUrl, '/api/users/me');
  assert.equal(result.response.status, 401);

  result = await request(baseUrl, '/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid json',
  });
  assert.equal(result.response.status, 400);

  result = await request(baseUrl, '/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(result.response.status, 400);

  result = await request(baseUrl, '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(result.response.status, 400);

  result = await request(baseUrl, '/api/users/me', { headers: auth });
  assert.equal(result.response.status, 200);
  assert.equal(Object.hasOwn(result.body.user, 'password'), false);

  result = await request(baseUrl, '/api/users/me', {
    method: 'PUT',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'admin' }),
  });
  assert.equal(result.response.status, 400);

  result = await request(baseUrl, '/api/users');
  assert.equal(result.response.status, 401);

  result = await request(baseUrl, '/api/users', { headers: auth });
  assert.equal(result.response.status, 403);

  result = await request(baseUrl, '/api/photos', { headers: auth });
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body.photos, []);

  result = await request(baseUrl, '/api/photos', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(result.response.status, 400);

  result = await request(baseUrl, '/api/photos/not-an-id', {
    method: 'PUT',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Updated' }),
  });
  assert.equal(result.response.status, 400);

  result = await request(baseUrl, '/api/photos/not-an-id', {
    method: 'DELETE',
    headers: auth,
  });
  assert.equal(result.response.status, 400);

  role = 'admin';
  result = await request(baseUrl, '/api/users', { headers: auth });
  assert.equal(result.response.status, 200);
  assert.equal(Object.hasOwn(result.body.users[0], 'password'), false);

  result = await request(baseUrl, '/api/photos/all', { headers: auth });
  assert.equal(result.response.status, 200);

  result = await request(baseUrl, '/api/users/not-an-id/promote', {
    method: 'PUT',
    headers: auth,
  });
  assert.equal(result.response.status, 400);

  result = await request(baseUrl, '/api/users/not-an-id/demote', {
    method: 'PUT',
    headers: auth,
  });
  assert.equal(result.response.status, 400);

  result = await request(baseUrl, '/api/users/not-an-id', {
    method: 'DELETE',
    headers: auth,
  });
  assert.equal(result.response.status, 400);
});
