import dotenv from 'dotenv';
dotenv.config();

export function envConfig<T>(name: string): T {
  return getEnvVariable(name) as T;
}

function getEnvVariable(name: string) {
  const env = process.env[name]!;

  if (!env) {
    throw new Error('Variable not found.');
  }

  return env;
}
