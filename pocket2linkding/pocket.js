let getPocket = require('pocket-api')

let consumer_key = '111211-6080e84bc644bdea5d1a66e';
let redirect_uri = 'https://lnk.simpzan.com';  // eg. 'localhost:8000/redirect'
let accessToken = 'be42724e-a2f2-cea9-b562-7de138'

global.log = {
    d() {console.log('D', ...arguments)},
    i() {console.log('I', ...arguments)},
    e() {console.log('E', ...arguments)},
}
class StdIn {
    static async readline() {
        const stdin = new StdIn();
        await stdin.getline();
        stdin.destroy();
    }
    constructor() {
        var readline = require('readline');
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });
    }
    getline = () => new Promise((resolve, reject) => {
        this.rl.once('line', resolve);
    });
    destroy() { this.rl.close(); }
}
function runCmd(cmd, verbose=true) {
    try {
        if (verbose) console.info(`cmd: ${cmd}`);
        const cp = require("child_process");
        const output = cp.execSync(cmd);
        const result = output.toString("utf8");
        if (verbose) console.info(`result:\n${result}`);
        return result.trim();
    } catch (err) {
        return null;
    }
}

const fs = require('fs');
function saveObject(obj, filename) {
    const str = JSON.stringify(obj, null, '\t');
    fs.writeFileSync(filename, str);
}
function loadObject(filename) {
    try {
        const str = fs.readFileSync(filename, 'utf8');
        return JSON.parse(str);
    } catch (error) {
        return null;
    }
}

async function fillAccessToken(pocket) {
    if (accessToken) {
        pocket.setAccessToken(accessToken)
        return accessToken
    }

    let requestToken = await pocket.getRequestToken()
    let url = `https://getpocket.com/auth/authorize?request_token=${requestToken}&redirect_uri=${redirect_uri}`
    log.d(url)
    runCmd(`open ${url}`)
    
    log.i("please grant permission in browser, then press enter to continue")
    await StdIn.readline();
    
    let response = await pocket.getAccessToken()
    log.d(response)
}
async function getLinks(pocket, offset, count, fav) {
    log.d('getLinks', offset, count, fav)
    let parameter_object = {count, offset, detailType: 'simple', sort: 'oldest'}
    parameter_object.favorite = fav ? '1' : '0'
    let response = await pocket.getArticles(parameter_object)
    if (response.status != 1 || response.error) return null
    let items = []
    Object.values(response.list).forEach(item => {
        items[item.sort_id] = item
    })
    // items.forEach((item, index) => log.d(index, item))
    return items
}
async function fetchFromPocket() {
    let pocket = new getPocket(consumer_key, redirect_uri)
    await fillAccessToken(pocket)

    const filename = 'links.json'
    let links = loadObject(filename) || {}
    let savedLinks = links.saved || []
    let favedLinks = links.faved || []

    async function getLinksFor(links, fav) {
        let count = 500
        while (true) {
            let items = await getLinks(pocket, links.length, count, fav)
            if (!items) break;
            links = links.concat(items)
            if (items.length < count) break
        }
        return links
    }
    favedLinks = await getLinksFor(savedLinks, true)
    savedLinks = await getLinksFor(savedLinks, false)
    links = {saved: savedLinks, faved: favedLinks}
    saveObject(links, filename)
    log.d('done')
    return links
}
function loadLinks() {
    const filename = 'links.json'
    let links = loadObject(filename) || {}
    let savedLinks = links.saved || []
    let favedLinks = links.faved || []
    links = savedLinks.concat(favedLinks)
    links.sort((a, b) => Number(a.time_added) - Number(b.time_added))
    return links
}
function generateHtml() {
    const links = loadLinks()
    const linksHtml = links.map(item => {
        let title = item.given_title || item.resolved_title
        let url = item.resolved_url || item.given_url
        let time_added = item.time_added
        let tags = item.favorite != "0" ? "fav" : ""
        return `<DT><A HREF="${url}" ADD_DATE="${time_added}" PRIVATE="1" TOREAD="1" TAGS="${tags}">${title}</A>`
    }).join('\n')
    const output = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
    <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
    <TITLE>Bookmarks</TITLE>
    <H1>Bookmarks</H1>
    <DL><p>
        ${linksHtml}
    </DL><p>`
    const htmlFilename = 'bookmarks.html'
    fs.writeFileSync(htmlFilename, output);
    console.log(`generated ${htmlFilename}, ${links.length} links`)
}
async function main() {
    if (process.env.download) {
        console.log('download from pocket')
        await fetchFromPocket()
    }
    generateHtml()
}
main().catch(console.error)
module.exports = {fetchFromPocket, loadLinks}
