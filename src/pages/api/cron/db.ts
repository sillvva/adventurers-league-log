import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  const result = await fetch(process.env.CRON_DB_URL || "");
	response.status(200).json(await result.json());
}
