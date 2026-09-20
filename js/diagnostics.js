// Development diagnostics — callable from console or future test tooling.
const Diagnostics = (() => {
  function run(){
    const r={version:BETWEEN_VERSION,content:App.runContentAudit(),capabilities:{indexedDB:Capabilities.canUseIndexedDB,share:Capabilities.canShare,notify:Capabilities.canNotify,vibrate:Capabilities.canVibrate},storage:{history:Storage.getHistory().length,moments:Storage.getMoments().length,capsules:Storage.getTimeCapsules().length,packs:Storage.getPacks().length,reports:Storage.getReports().length}};
    window.BETWEEN_DIAGNOSTICS=r; console.table(r.storage); return r;
  }
  return {run};
})();
