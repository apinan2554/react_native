const mockExecute = jest.fn().mockReturnValue({ rows: [], insertId: 0 });

const mockDb = {
  execute: mockExecute,
  close: jest.fn(),
};

export const open = jest.fn().mockReturnValue(mockDb);
export type OPSQLiteConnection = typeof mockDb;
