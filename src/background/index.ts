import { Storage } from "@plasmohq/storage";

const sessionStorage = new Storage({ area: "session" })

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return
  const url = new URL(tab.url)
  // Enables the side panel on google.com
  if (url.origin === "https://www.youtube.com") {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled: true
    })
  } else {
    // Disables the side panel on all other sites
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false
    })
  }
})

chrome.webNavigation.onHistoryStateUpdated.addListener(
  async (details) => {
    if (details.url.includes("/watch")) {
      const newVideoId = new URL(details.url).searchParams.get("v")
      const currentVideoId = await sessionStorage.get(details.tabId.toString())

      if (currentVideoId && currentVideoId !== newVideoId) {
        // Video has changed, close the side panel by disabling and re-enabling
        await chrome.sidePanel.setOptions({
          tabId: details.tabId,
          enabled: false
        })
        await chrome.sidePanel.setOptions({
          tabId: details.tabId,
          enabled: true
        })
        await sessionStorage.remove(details.tabId.toString())
        // Video context stays persistent (video-centric storage)
      }
    }
  },
  { url: [{ hostContains: "www.youtube.com" }] }
)

chrome.tabs.onRemoved.addListener((tabId) => {
  sessionStorage.remove(tabId.toString())
  // Video context stays persistent (video-centric storage)
})

export {}