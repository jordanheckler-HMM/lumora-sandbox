#!/usr/bin/env node

import http from 'http';

console.log('🔍 Checking if Ollama is running...\n');

const options = {
  hostname: 'localhost',
  port: 11434,
  path: '/api/tags',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Ollama is running on http://localhost:11434');
    console.log('✅ Ready to start Lumora Sandbox!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Ollama responded with status:', res.statusCode);
    console.log('Please ensure Ollama is running properly.\n');
    process.exit(1);
  }
});

req.on('error', (error) => {
  console.error('❌ Cannot connect to Ollama!');
  console.error('Please make sure Ollama is installed and running.\n');
  console.log('To start Ollama:');
  console.log('  1. Install from: https://ollama.ai');
  console.log('  2. Run: ollama serve');
  console.log('  3. Pull a model: ollama pull llama2\n');
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  console.error('❌ Connection to Ollama timed out!');
  console.error('Please make sure Ollama is running on port 11434.\n');
  process.exit(1);
});

req.end();
