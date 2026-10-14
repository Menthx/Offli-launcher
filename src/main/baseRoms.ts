import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'

/**
 * ROMs officielles non modifiées, par SHA-1 (noms No-Intro, relevés dans libretro-database).
 * Une ROM reconnue ici est un jeu de base, pas un romhack.
 */
export const BASE_ROM_SHA1: Record<string, string> = {
  // Émeraude française d'un autre dump que celui de No-Intro, relevée dans la bibliothèque de Tonio
  '677a84289a295926b73172238458ac307e238fd7': 'Pokemon - Version Emeraude (France)',
  '0802d1fb185ee3ed48d9a22afb25e66424076dac': 'Pokemon - Blattgruene Edition (Germany)',
  'fe1558a3dcb0360ab558969e09b690888b846dd9': 'Pokemon - Edicion Esmeralda (Spain)',
  'ab8f6bfe0ccdaf41188cd015c8c74c314d02296a': 'Pokemon - Edicion Rojo Fuego (Spain)',
  '1f49f7289253dcbfecbc4c5ba3e67aa0652ec83c': 'Pokemon - Edicion Rubi (Spain)',
  '9ac73481d7f5d150a018309bba91d185ce99fb7c': 'Pokemon - Edicion Rubi (Spain) (Rev 1)',
  'f9ebee5d228cb695f18ef2ced41630a09fa9eb05': 'Pokemon - Edicion Verde Hoja (Spain)',
  '3a6489189e581c4b29914071b79207883b8c16d8': 'Pokemon - Edicion Zafiro (Spain)',
  '0fe9ad1e602e2fafa090aee25e43d6980625173c': 'Pokemon - Edicion Zafiro (Spain) (Rev 1)',
  'f3ae088181bf583e55daf962a92bb46f4f1d07b7': 'Pokemon - Emerald Version (USA, Europe)',
  '18a3758ceeef2c77b315144be2c3910d6f1f69fe': 'Pokemon - Feuerrote Edition (Germany)',
  '41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc': 'Pokemon - FireRed Version (USA, Europe)',
  'dd5945db9b930750cb39d00c84da8571feebf417': 'Pokemon - FireRed Version (USA, Europe) (Rev 1)',
  '574fa542ffebb14be69902d1d36f1ec0a4afd71e': 'Pokemon - LeafGreen Version (USA, Europe)',
  '7862c67bdecbe21d1d69ce082ce34327e1c6ed5e': 'Pokemon - LeafGreen Version (USA, Europe) (Rev 1)',
  '1c2a53332382e14dab8815e3a6dd81ad89534050': 'Pokemon - Rubin-Edition (Germany)',
  '424740be1fc67a5ddb954794443646e6aeee2c1b': 'Pokemon - Rubin-Edition (Germany) (Rev 1)',
  'f28b6ffc97847e94a6c21a63cacf633ee5c8df1e': 'Pokemon - Ruby Version (USA, Europe)',
  '610b96a9c9a7d03d2bafb655e7560ccff1a6d894': 'Pokemon - Ruby Version (USA, Europe) (Rev 1)',
  '5b64eacf892920518db4ec664e62a086dd5f5bc8': 'Pokemon - Ruby Version (USA, Europe) (Rev 2)',
  '5a087835009d552d4c5c1f96be3be3206e378153': 'Pokemon - Saphir-Edition (Germany)',
  '7e6e034f9cdca6d2c4a270fdb50a94def5883d17': 'Pokemon - Saphir-Edition (Germany) (Rev 1)',
  '3ccbbd45f8553c36463f13b938e833f652b793e4': 'Pokemon - Sapphire Version (USA, Europe)',
  '4722efb8cd45772ca32555b98fd3b9719f8e60a9': 'Pokemon - Sapphire Version (USA, Europe) (Rev 1)',
  '89b45fb172e6b55d51fc0e61989775187f6fe63c': 'Pokemon - Sapphire Version (USA, Europe) (Rev 2)',
  '61c2eb2b380b1a75f0c94b767a2d4c26cd7ce4e3': 'Pokemon - Smaragd-Edition (Germany)',
  'ca666651374d89ca439007bed54d839eb7bd14d0': 'Pokemon - Version Emeraude (France)',
  'fc663907256f06a3a09e2d6b967bc9af4919f111': 'Pokemon - Version Rouge Feu (France)',
  'a6ee94202bec0641c55d242757e84dc89336d4cb': 'Pokemon - Version Rubis (France)',
  'ba888dfba231a231cbd60fe228e894b54fb1ed79': 'Pokemon - Version Rubis (France) (Rev 1)',
  'c269b5692b2d0e5800ba1ddf117fda95ac648634': 'Pokemon - Version Saphir (France)',
  '860e93f5ea44f4278132f6c1ee5650d07b852fd8': 'Pokemon - Version Saphir (France) (Rev 1)',
  '4b5758c14d0a07b70ef3ef0bd7fa5e7ce6978672': 'Pokemon - Version Vert Feuille (France)',
  '66a9d415205321376b4318534c0dce5f69d28362': 'Pokemon - Versione Rosso Fuoco (Italy)',
  '2b3134224392f58da00f802faa1bf4b5cf6270be': 'Pokemon - Versione Rubino (Italy)',
  '015a5d380afe316a2a6fcc561798ebff9dfb3009': 'Pokemon - Versione Rubino (Italy) (Rev 1)',
  '1692db322400c3141c5de2db38469913ceb1f4d4': 'Pokemon - Versione Smeraldo (Italy)',
  'a1dfea1493d26d1f024be8ba1de3d193fcfc651e': 'Pokemon - Versione Verde Foglia (Italy)',
  'f729dd571fb2c09e72c5c1d68fe0a21e72713d34': 'Pokemon - Versione Zaffiro (Italy)',
  '73edf67b9b82ff12795622dca412733755d2c0fe': 'Pokemon - Versione Zaffiro (Italy) (Rev 1)',
  '20e72dc6f41493eee1fdd0cef54214e6c3389688': 'Pokemon - Blaue Edition (Germany) (SGB Enhanced)',
  'd7037c83e1ae5b39bde3c30787637ba1d4c48ce2': 'Pokemon - Blue Version (USA, Europe) (SGB Enhanced)',
  '1dc242039218fba50928d1afb66b70565b6b9daf': 'Pokemon - Edicion Amarilla - Edicion Especial Pikachu (Spain) (CGB+SGB Enhanced)',
  '7715e7b133e8634df48918b9138374110212a108': 'Pokemon - Edicion Azul (Spain) (SGB Enhanced)',
  'fc17c5b904d551b1b908054ccd1c493f755f832a': 'Pokemon - Edicion Roja (Spain) (SGB Enhanced)',
  '42f3714eec6eca25200d42461ff08d57c98f6d1d': 'Pokemon - Gelbe Edition - Special Pikachu Edition (Germany) (CGB+SGB Enhanced)',
  'ea9bcae617fdf159b045185467ae58b2e4a48b9a': 'Pokemon - Red Version (USA, Europe) (SGB Enhanced)',
  '87d523fe1a0c548db7c5477b451ddec1eb083c06': 'Pokemon - Rote Edition (Germany) (SGB Enhanced)',
  '47faa910d0e073c600665bf9c83b6bd17babdf8a': 'Pokemon - Version Bleue (France) (SGB Enhanced)',
  '0aceec0ef7aa2ca5aa831554598d91f61a925591': 'Pokemon - Version Jaune - Edition Speciale Pikachu (France) (CGB+SGB Enhanced)',
  '47a7622fa30e6402a3891fe65b3a930bf9bd7aec': 'Pokemon - Version Rouge (France) (SGB Enhanced)',
  'f69ed1a1332f04c24c7db899a09019bb045fa8b3': 'Pokemon - Versione Blu (Italy) (SGB Enhanced)',
  '05bb8e99f24d498613930949730afa8024e77d08': 'Pokemon - Versione Gialla - Speciale Edizione Pikachu (Italy) (CGB+SGB Enhanced)',
  '65b97cf8f2f1cff711a6d08c6c894c8ce65ce522': 'Pokemon - Versione Rossa (Italy) (SGB Enhanced)',
  'cc7d03262ebfaf2f06772c1a480c7d9d5f4a38e1': 'Pokemon - Yellow Version - Special Pikachu Edition (USA, Europe) (CGB+SGB Enhanced)',
  'a0fc810f1d4e124434f7be2c989ab5b5892ddf36': 'Pokemon - Crystal Version (Australia)',
  'f4cd194bdee0d04ca4eac29e09b8e4e9d818c133': 'Pokemon - Crystal Version (USA)',
  'f2f52230b536214ef7c9924f483392993e226cfb': 'Pokemon - Crystal Version (USA, Europe) (Rev 1)',
  '889a06fc0bb863666865aa69def0adf97945ac2a': 'Pokemon - Edicion Cristal (Spain)',
  '162ea54c6a3cff374642e6dd842f9bffac847e7b': 'Pokemon - Edicion Oro (Spain) (SGB Enhanced) (GB Compatible)',
  '05bd978ab2cb104b0aff3f696896e30885203a18': 'Pokemon - Edicion Plata (Spain) (SGB Enhanced) (GB Compatible)',
  'd8b8a3600a465308c9953dfa04f0081c05bdcb94': 'Pokemon - Gold Version (USA, Europe) (SGB Enhanced) (GB Compatible)',
  '9254195d461ea942eaaa08cc4b83de3cf82aea0d': 'Pokemon - Goldene Edition (Germany) (SGB Enhanced) (GB Compatible)',
  'accb584293ba056152f1fd908439b019017ff2fe': 'Pokemon - Kristall-Edition (Germany)',
  '8ecc58d621faaedf2a934bd2583d527220df7bb9': 'Pokemon - Silberne Edition (Germany) (SGB Enhanced) (GB Compatible)',
  '49b163f7e57702bc939d642a18f591de55d92dae': 'Pokemon - Silver Version (USA, Europe) (SGB Enhanced) (GB Compatible)',
  'a4a7e8079b7a53e4d9ef43382bbb1090b9d45d1a': 'Pokemon - Version Argent (France) (SGB Enhanced) (GB Compatible)',
  'c055992b16b7399c687647725cdd1f4f13a2f75c': 'Pokemon - Version Cristal (France)',
  'c147c0d8c2b71b7628a7233436f5c052b5b17081': 'Pokemon - Version Or (France) (SGB Enhanced) (GB Compatible)',
  'c9eca9d0a837beb9137bb7d779e469c54e9f8d77': 'Pokemon - Versione Argento (Italy) (SGB Enhanced) (GB Compatible)',
  '6cee05e5b95beeae74b8365ad18ec4a07a8c4af8': 'Pokemon - Versione Cristallo (Italy)',
  '032608fe8947b627584a4a0eccc7bf9ad3588426': 'Pokemon - Versione Oro (Italy) (SGB Enhanced) (GB Compatible)',
  '26ad0b9967aa279c4a266ee69f52b9b2332399a5': 'Pokemon - Black Version (USA, Europe) (NDSi Enhanced)',
  'e51e6dfb8678a3d19dcd2a10691b96a569ca0abb': 'Pokemon - Black Version 2 (USA, Europe) (NDSi Enhanced)',
  '432dbe312bc51e36bb8cb6fcb5e08f6968f124a4': 'Pokemon - Diamant-Edition (Germany) (Rev 5)',
  '66d2fbfb0dbc1f86a3d726971196989b950092bc': 'Pokemon - Diamond Version (Europe) (Rev 5)',
  'a46233d8b79a69ea87aa295a0efad5237d02841e': 'Pokemon - Diamond Version (USA) (Rev 5)',
  '4cc963ca925409ff0f12f3c417d1cbe1094bf934': 'Pokemon - Edicion Blanca (Spain) (NDSi Enhanced)',
  '072749c9517f8d2a65f688b6f4ac5f30889fb559': 'Pokemon - Edicion Blanca 2 (Spain) (NDSi Enhanced)',
  'ce2595eba1e23eacb37056598319619f81aefc29': 'Pokemon - Edicion Diamante (Spain) (Rev 5)',
  '68b55b82f5a033f9e9666c232f429e31ed658e54': 'Pokemon - Edicion Negra (Spain) (NDSi Enhanced)',
  'b69a30d5f0456ad1a3a1b52a945729f686b0299b': 'Pokemon - Edicion Negra 2 (Spain) (NDSi Enhanced)',
  '237cc2e34e51dc291eb61238b8e75f9e78ba1285': 'Pokemon - Edicion Oro HeartGold (Spain)',
  '3f0e08537c5579c9492d4a9cdff3ae30bb037f3b': 'Pokemon - Edicion Perla (Spain) (Rev 5)',
  'beaae88bb1dc7d09de5f393a67ef0559bde508c8': 'Pokemon - Edicion Plata SoulSilver (Spain)',
  '12faf0dbcf0fb558438e464afbfe7c5b5e79e8c6': 'Pokemon - Edicion Platino (Spain)',
  '13b6853aa93121069df1d17446d3ecb36872aecf': 'Pokemon - Goldene Edition HeartGold (Germany)',
  'eb47ab4ba0326ae842135f62c7ec68cf85c9785f': 'Pokemon - HeartGold Version (Europe)',
  '4fcded0e2713dc03929845de631d0932ea2b5a37': 'Pokemon - HeartGold Version (USA)',
  'b5652db288c75417de159d93d297689c885dbbd1': 'Pokemon - Pearl Version (Europe) (Rev 5)',
  '99083bf15ec7c6b81b4ba241ee10abd9e80999ac': 'Pokemon - Pearl Version (USA) (Rev 5)',
  'c13395f2a35bb9d2f8e867d9f504896398f795cb': 'Pokemon - Perl-Edition (Germany) (Rev 5)',
  'd40f19ac24d67c721a4ab25e1c013154443d75b4': 'Pokemon - Platin-Edition (Germany)',
  '8d15cd443d4e83e20493c79d3f9dc408c4f51ae0': 'Pokemon - Platinum Version (Europe)',
  'ce81046eda7d232513069519cb2085349896dec7': 'Pokemon - Platinum Version (USA)',
  '0862ec35b24de5c7e2dcb88c9eea0873110d755c': 'Pokemon - Platinum Version (USA) (Rev 1)',
  'f5688bd617be7e67a150732f42cfae6ae104b2cb': 'Pokemon - Schwarze Edition (Germany) (NDSi Enhanced)',
  'f43dd2e26f48163f11721bd1e3b2e6f9a73be636': 'Pokemon - Schwarze Edition 2 (Germany) (NDSi Enhanced)',
  '576cdb7eec728c49aed85b9dd7e1e084ba1f08f9': 'Pokemon - Silberne Edition SoulSilver (Germany)',
  '27a25c23aa1c0ecabe48a30a004b96c9dbc97730': 'Pokemon - SoulSilver Version (Europe)',
  'f8dc38ea20c17541a43b58c5e6d18c1732c7e582': 'Pokemon - SoulSilver Version (USA, Australia)',
  'ba78f6fff3fc1e32aff8fcc4707a2da1ec996f7c': 'Pokemon - Version Argent SoulSilver (France)',
  '28f075915dd445cbfd902f1e1a94d5048b03a095': 'Pokemon - Version Blanche (France) (NDSi Enhanced)',
  'c228793d63cf43edca3285f42a6f91abaec90247': 'Pokemon - Version Blanche 2 (France) (NDSi Enhanced)',
  'e961e632ca6f72f81e19c5be3d93936772e8544a': 'Pokemon - Version Diamant (France) (Rev 5)',
  'a559da54839663d8f8f3f03382e5665a61873d22': 'Pokemon - Version Noire (France) (NDSi Enhanced)',
  '971ccee9a738d5d172220a45dce1e9c40e49e563': 'Pokemon - Version Noire 2 (France) (NDSi Enhanced)',
  'f09016569ee5dbac9dd0098d04927987c47645b9': 'Pokemon - Version Or HeartGold (France)',
  'dbe7ff557a2d166038f5294ed82868150fe84442': 'Pokemon - Version Perle (France) (Rev 5)',
  '41ea92f794560e347cd9509f5ec9e9d479a4bbf1': 'Pokemon - Version Platine (France)',
  'e137acf711e0b14c297abf0254e5b4a9263338e7': 'Pokemon - Versione Argento SoulSilver (Italy)',
  '2e33164d26236dd499f75d1de3123d85e822d502': 'Pokemon - Versione Bianca (Italy) (NDSi Enhanced)',
  'b787bdd69fa79d270d08f334b188a61e3454405e': 'Pokemon - Versione Bianca 2 (Italy) (NDSi Enhanced)',
  'cd7bcb4de080f3548ca3fb14d946d5ddc717b03b': 'Pokemon - Versione Diamante (Italy) (Rev 5)',
  '699f8c6a8390b5e30236b6c386bc3c4bd7bdc44e': 'Pokemon - Versione Nera (Italy) (NDSi Enhanced)',
  '68ec308db75d470f3c1499cc04117fe68fb4e942': 'Pokemon - Versione Nera 2 (Italy) (NDSi Enhanced)',
  '6b7f9bff57eb58bc8d6e48e9e5c370719458c721': 'Pokemon - Versione Oro HeartGold (Italy)',
  '23c5695662e906d9d57ff6e0b3e7842b9e7a1b84': 'Pokemon - Versione Perla (Italy) (Rev 5)',
  '19148e7a38e731680fb2a045ed112b115be90fc2': 'Pokemon - Versione Platino (Italy)',
  'fb752b211351f8480e3e1949e11a1d7741f05f5a': 'Pokemon - Weisse Edition (Germany) (NDSi Enhanced)',
  '60665d23a12a0ad4fbff75a4d4f287a9cec73b40': 'Pokemon - Weisse Edition 2 (Germany) (NDSi Enhanced)',
  'bc696a0dfb448c7b3a8a206f0f8214411a039208': 'Pokemon - White Version (USA, Europe) (NDSi Enhanced)',
  'b5d7490be7b415b8f1e672a53e978a9cc667e56a': 'Pokemon - White Version 2 (USA, Europe) (NDSi Enhanced)'
}

/** Taille au-delà de laquelle on ne calcule pas l'empreinte (les ROMs DS font au plus 512 Mo) */
const MAX_HASH_SIZE = 512 * 1024 * 1024

export interface HashEntry {
  size: number
  mtimeMs: number
  sha1: string
}

/** Empreintes déjà calculées, par chemin : un rescan ne relit que les fichiers modifiés */
export type HashCache = Record<string, HashEntry>

function sha1File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha1')
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')))
  })
}

/** Nom No-Intro si le fichier est une ROM officielle non modifiée */
export async function identifyBaseRom(path: string, cache: HashCache): Promise<string | undefined> {
  const st = await stat(path)
  if (st.size > MAX_HASH_SIZE) return undefined
  let entry = cache[path]
  if (!entry || entry.size !== st.size || entry.mtimeMs !== st.mtimeMs) {
    entry = { size: st.size, mtimeMs: st.mtimeMs, sha1: await sha1File(path) }
    cache[path] = entry
  }
  return BASE_ROM_SHA1[entry.sha1]
}
