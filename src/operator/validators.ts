import dotenv from 'dotenv'
import { cleanEnv, str } from 'envalid'

// Load environment variables from .env file
dotenv.config()
export const operatorEnv = cleanEnv(process.env, {
  GITEA_USERNAME: str({ desc: 'Gitea username' }),
  GITEA_PASSWORD: str({ desc: 'Gitea password' }),
  SOPS_AGE_KEY: str({ desc: 'SOPS age key' }),
})
