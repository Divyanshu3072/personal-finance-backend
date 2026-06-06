import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.use('/', routes);

app.use(errorHandler);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});

export default app;