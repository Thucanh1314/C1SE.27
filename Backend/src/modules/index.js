// src/modules/index.js
// Central module loader for modular architecture

const authRbac = require('./auth-rbac');
const users = require('./users');
const surveys = require('./surveys');
const responses = require('./responses');
const templates = require('./templates');
const analytics = require('./analytics');
const exportModule = require('./export');
const collectors = require('./collectors');
const health = require('./health');
const notifications = require('./notifications');
const workspaces = require('./workspaces');
const llm = require('./llm');
const chat = require('./chat');
const questions = require('./questions');
const permissions = require('./permissions');

module.exports = {
  authRbac,
  users,
  surveys,
  responses,
  templates,
  analytics,
  export: exportModule,
  collectors,
  health,
  notifications,
  workspaces,
  llm,
  chat,
  questions,
  permissions
};