import { Application, Request, Response } from "express";

export const loadApiEndpoints = (app: Application): void => {
  app.get("/api", (req: Request, res: Response) => {
    return res.status(200).send({hello: "Hi!"});
  });
};
