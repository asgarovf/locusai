import "reflect-metadata";
import "../../test-setup";
import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { HealthController } from "../health.controller";

describe("HealthController", () => {
  let controller: HealthController;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: {
            query: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    dataSource = module.get(DataSource);
  });

  it("should return ok when database is up", async () => {
    dataSource.query.mockResolvedValue([{ 1: 1 }]);

    const result = await controller.check();

    expect(result).toEqual({
      status: "ok",
      services: {
        database: "up",
      },
    });
    expect(dataSource.query).toHaveBeenCalledWith("SELECT 1");
  });

  it("should return error when database is down", async () => {
    dataSource.query.mockRejectedValue(new Error("DB Down"));

    const result = await controller.check();

    expect(result).toEqual({
      status: "error",
      services: {
        database: "down",
      },
    });
  });
});
