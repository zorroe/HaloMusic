interface PlayListBaseInfo {
    id: number;
    name: string;
    picUrl: string;
    playCount: number;
    creator?:{
        id:number;
        nickname:string;
    }
}

export type{
    PlayListBaseInfo
}