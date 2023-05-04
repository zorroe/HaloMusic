interface UserProfile {
    userId: number;
    userType: number;
    nickname: string;
    avatarImgId: AvatarImgId;
    avatarUrl: string;
    backgroundImgId: AvatarImgId;
    backgroundUrl: string;
    signature: string;
    createTime: number;
    userName: string;
    accountType: number;
    shortUserName: string;
    birthday: number;
    authority: number;
    gender: number;
    accountStatus: number;
    province: number;
    city: number;
    authStatus: number;
    description?: any;
    detailDescription?: any;
    defaultAvatar: boolean;
    expertTags?: any;
    experts?: any;
    djStatus: number;
    locationStatus: number;
    vipType: number;
    followed: boolean;
    mutual: boolean;
    authenticated: boolean;
    lastLoginTime: number;
    lastLoginIP: string;
    remarkName?: any;
    viptypeVersion: number;
    authenticationTypes: number;
    avatarDetail?: any;
    anchor: boolean;
  }
  
  interface AvatarImgId {
    s: number;
    e: number;
    c: number[];
  }

export type{
    UserProfile
}