import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SpotifyLogo, LastfmLogo } from "@phosphor-icons/react/dist/ssr";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import Image from "next/image";
import { use } from "react";
import querystring from "querystring";

interface Albums {
  url: string;
  playcount: string;
  name: string;
  mbid: string;
  "@attr": string;
  artist: {
    "#text": string;
    mbid: string;
  };
}

interface WeeklyChart {
  weeklyalbumchart: {
    album: Albums[];
  };
}

const {
  SPOTIFY_CLIENT_ID: client_id,
  SPOTIFY_CLIENT_SECRET: client_secret,
  SPOTIFY_REFRESH_TOKEN: refresh_token,
} = process.env;

const weeklyChartPromise = async () => {
  const data = await fetch(
    "https://ws.audioscrobbler.com/2.0/?method=user.getweeklyalbumchart&user=kirinzito&api_key=d1d0e0ae8b386c15aee8df74c008fa43&format=json"
  );
  const weeklyChart: WeeklyChart = await data.json();

  return weeklyChart;
};

const getUserInfoPromise = async () => {
  const userInfo = await fetch(
    "https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=kirinzito&api_key=d1d0e0ae8b386c15aee8df74c008fa43&format=json"
  );

  const userInfoData = await userInfo.json();

  return userInfoData;
};

const basic = Buffer.from(`${client_id}:${client_secret}`).toString("base64");
const NOW_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;

const getAccessToken = async () => {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: querystring.stringify({
      grant_type: "refresh_token",
      refresh_token,
    }),
  });

  return response.json();
};

const getNowPlaying = async () => {
  const { access_token } = await getAccessToken();

  return fetch(NOW_PLAYING_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
};

const getCurrentPlaying = async () => {
  const response = await getNowPlaying();

  const data = response.body !== null ? await response.json() : null;

  const currentPlayingData = {
    isPlaying: data?.is_playing,
    title: data?.item?.name,
    album: data?.item?.album?.name,
    artist: data?.item?.album?.artists
      .map((artist: { name: string }) => artist.name)
      .join(", "),
    albumImageUrl: data?.item?.album?.images[0].url,
    songUrl: data?.item?.external_urls?.spotify,
  };

  return currentPlayingData;
};

export default function Home() {
  const weeklyChart: WeeklyChart = use(weeklyChartPromise());
  const userInfo = use(getUserInfoPromise());
  const currentPlaying = use(getCurrentPlaying());

  const userInfoImage = userInfo?.user?.image?.find(
    (image: { size: string; "#text": string }) => image.size === "extralarge"
  );

  const getPhotoAlbum = async (album: Albums) => {
    console.log(album);
    const photo = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key=d1d0e0ae8b386c15aee8df74c008fa43&artist=${album.artist["#text"]}&album=${album.name}&format=json`
    );

    const photoData = await photo.json();

    return photoData?.album?.image?.find(
      (image: { size: string; "#text": string }) => image.size === "mega"
    );
  };

  const extractFirstTwoLetters = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("");
  };

  return (
    <>
      <div className="bg-bg h-screen flex items-start justify-center p-14 w-screen">
        <div className="flex flex-col w-full gap-6">
          <div className="flex justify-between items-center">
            <h1 className=" pixelized-font text-3xl">
              See what i&apos;ve been hearing in the last week
            </h1>
            {currentPlaying?.isPlaying ? (
              <div className="pixelized-font flex flex-col">
                <span>Current playing:</span>
                <div className="flex items-center gap-2 group relative">
                  <Image
                    src={currentPlaying?.albumImageUrl}
                    alt={`Foto do álbum ${currentPlaying?.title}`}
                    width={400}
                    height={400}
                    className="absolute bottom-0 right-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  <span className="text-red-600 text-3xl">
                    {currentPlaying?.title}
                  </span>{" "}
                  - {currentPlaying?.artist}
                </div>
              </div>
            ) : (
              <div className="pixelized-font text-xl">
                Not playing anything right now {":("}
              </div>
            )}

            <div className="flex items-center gap-4">
              <h2 className="pixelized-font text-xl">{userInfo?.user?.name}</h2>
              <ContextMenu>
                <ContextMenuTrigger>
                  <Avatar>
                    <AvatarImage src={userInfoImage["#text"]} />
                    <AvatarFallback>
                      {extractFirstTwoLetters(userInfo?.user?.name)}
                    </AvatarFallback>
                  </Avatar>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem inset>
                    <a
                      href={userInfo?.user?.url}
                      target="_blank"
                      className="flex items-center gap-2 pixelized-font"
                    >
                      Follow me on LastFM
                      <LastfmLogo size={32} color="#ffffff" />
                    </a>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem inset>
                    <a
                      href="https://open.spotify.com/user/1tic8sv4o1lnljhs7dl9xvofm?si=f9ac12fd7df34cf5"
                      target="_blank"
                      className="flex items-center gap-2 pixelized-font"
                    >
                      Follow me on Spotify
                      <SpotifyLogo size={32} color="#ffffff" />
                    </a>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>
          </div>
          <div className="grid grid-cols-4 grid-rows-2 gap-6 w-full">
            {weeklyChart.weeklyalbumchart.album.map(async (album: Albums) => {
              const photo = await getPhotoAlbum(album);

              return (
                <>
                  <Card
                    key={album.name}
                    className="mt-4 w-[450px] h-[450px] group flex items-center justify-center"
                  >
                    <CardHeader className="flex items-center justify-center p-0 rounded-base relative w-full">
                      {photo && (
                        <Image
                          src={photo["#text"]}
                          alt={`Foto do álbum ${album.name}`}
                          width={450}
                          height={450}
                          className="w-full h-full filter  group-hover:brightness-50 group-hover:blur-sm transition-all duration-300"
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CardContent className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-full h-full flex flex-col items-center justify-center gap-4">
                          <div className="flex flex-col items-center justify-center gap-2 text-center">
                            <h2 className="pixelized-font text-4xl text-red-300">
                              {album.name}
                            </h2>
                            <p className="pixelized-font">
                              <span className="text-red-300">
                                {album.artist["#text"]}
                              </span>{" "}
                              - {album.playcount} plays
                            </p>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              asChild
                              variant="reverse"
                              size="default"
                              className="pixelized-font"
                            >
                              <a
                                href={album.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                See on Last.fm
                              </a>
                            </Button>
                          </div>
                        </CardContent>
                      </div>
                    </CardHeader>
                  </Card>
                </>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
