module.exports = {
  apps: [
    {
      name: 'base-gpt-ws',
      script: 'server.js',
      env: {
        HOST: '192.168.17.12',
        PORT: '8080',
        OLLAMA_MODEL: 'llama3.3:70b',
        OLLAMA_URL: 'http://localhost:11434',
      },
    },
    {
      name: 'base-gpt-ui',
      script: 'serve-ui.js',
      env: {
        HOST: '192.168.17.12',
        UI_PORT: '3000',
      },
    },
  ],
};
