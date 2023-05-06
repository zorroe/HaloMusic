<template>
    <div class="special-playlist">
      <div class="title gradient"> 每日歌曲推荐 </div>
      <div class="subtitle">根据你的音乐口味生成 · 每天6:00更新</div>
    </div>
    <music-table :data="recommendSongList"></music-table>
</template>

<script setup lang="ts">
import { getRecommendSongsApi } from '@/api/music';
import { MusicBaseInfo } from '@/types/musicRel';
import dayjs from 'dayjs';
import { onMounted, ref } from 'vue';

/* 每日推荐歌曲页面 */
const recommendSongList = ref<MusicBaseInfo[]>([]);

const getRecommendSongs = async () => {
  const { data } = await getRecommendSongsApi();
  data.dailySongs.forEach((item: any) => {
    recommendSongList.value.push({
      id: item.id,
      name: item.name,
      picUrl: item.al.picUrl,
      singers: item.ar.map((item: any) => {
        return {
          id: item.id,
          name: item.name,
          picUrl: "",
        };
      }),
      duration: dayjs(item.dt).format("mm:ss"),
      album: {
        id: item.al.id,
        name: item.al.name,
      },
    });
  });
};

onMounted(()=>{
    getRecommendSongs()
})

</script>

<style lang="scss" scoped>

.special-playlist {
  margin-top: 192px;
  margin-bottom: 128px;
  border-radius: 1.25em;
  text-align: center;

  @keyframes letterSpacing4 {
    from {
      letter-spacing: 0px;
    }

    to {
      letter-spacing: 4px;
    }
  }

  @keyframes letterSpacing1 {
    from {
      letter-spacing: 0px;
    }

    to {
      letter-spacing: 1px;
    }
  }

  .title {
    font-size: 84px;
    line-height: 1.05;
    font-weight: 700;
    text-transform: uppercase;

    letter-spacing: 4px;
    animation-duration: 0.8s;
    animation-name: letterSpacing4;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    // background-image: linear-gradient(
    //   225deg,
    //   var(--color-primary),
    //   var(--color-primary)
    // );

    img {
      height: 78px;
      border-radius: 0.125em;
      margin-right: 24px;
    }
  }
  .subtitle {
    font-size: 18px;
    letter-spacing: 1px;
    margin: 28px 0 54px 0;
    animation-duration: 0.8s;
    animation-name: letterSpacing1;
    text-transform: uppercase;
    color: var(--color-text);
  }
  .buttons {
    margin-top: 32px;
    display: flex;
    justify-content: center;
    button {
      margin-right: 16px;
    }
  }
}

.gradient {
  background: linear-gradient(to left, #dd2476, #ff512f);
}
</style>