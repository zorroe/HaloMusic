interface MvBaseInfo {
  id: number;
  name: string;
  picUrl: string;
  creators: [
    {
      id: number;
      name: string;
    }
  ];
}

export type { MvBaseInfo };
