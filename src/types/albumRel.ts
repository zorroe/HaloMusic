import { ArtistBaseInfo } from "./artistRel";

interface AlbumBaseInfo {
  id: number;
  name: string;
  picUrl: string;
  artists: ArtistBaseInfo[];
}

interface AlbumInfo {
  songs: any[];
  paid: boolean;
  onSale: boolean;
  mark: number;
  awardTags?: any;
  companyId: number;
  blurPicUrl: string;
  alias: any[];
  artists: Artist[];
  copyrightId: number;
  picId: Img1v1Id;
  artist: Artist2;
  pic: Img1v1Id;
  publishTime: number;
  company: string;
  briefDesc: string;
  picUrl: string;
  commentThreadId: string;
  tags: string;
  description: string;
  status: number;
  subType: string;
  name: string;
  id: number;
  type: string;
  size: number;
  picId_str: string;
  info: Info;
}

interface Info {
  commentThread: CommentThread;
  latestLikedUsers?: any;
  liked: boolean;
  comments?: any;
  resourceType: number;
  resourceId: number;
  commentCount: number;
  likedCount: number;
  shareCount: number;
  threadId: string;
}

interface CommentThread {
  id: string;
  resourceInfo: ResourceInfo;
  resourceType: number;
  commentCount: number;
  likedCount: number;
  shareCount: number;
  hotCount: number;
  latestLikedUsers?: any;
  resourceOwnerId: number;
  resourceTitle: string;
  resourceId: number;
}

interface ResourceInfo {
  id: number;
  userId: number;
  name: string;
  imgUrl: string;
  creator?: any;
  encodedId?: any;
  subTitle?: any;
  webUrl?: any;
}

interface Artist2 {
  img1v1Id: Img1v1Id;
  topicPerson: number;
  followed: boolean;
  alias: string[];
  picId: Img1v1Id;
  trans: string;
  briefDesc: string;
  musicSize: number;
  albumSize: number;
  picUrl: string;
  img1v1Url: string;
  name: string;
  id: number;
  picId_str: string;
  img1v1Id_str: string;
}

interface Artist {
  img1v1Id: Img1v1Id;
  topicPerson: number;
  followed: boolean;
  alias: any[];
  picId: number;
  trans: string;
  briefDesc: string;
  musicSize: number;
  albumSize: number;
  picUrl: string;
  img1v1Url: string;
  name: string;
  id: number;
  img1v1Id_str: string;
}

interface Img1v1Id {
  s: number;
  e: number;
  c: number[];
}

export type { AlbumBaseInfo,AlbumInfo };
