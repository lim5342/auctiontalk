window.AUCTIONTALK_SUPABASE_SETTINGS = {
    url: 'https://hlkngiqlkumebqauiyee.supabase.co',
    anonKey: 'sb_publishable_SA87154117_-bz2SStCeoQ_6JiFojbi'
};

(function initAuctionTalkSupabase() {
    const settings = window.AUCTIONTALK_SUPABASE_SETTINGS || {};
    const isFilled = (value) => {
        if (typeof value !== 'string') return false;
        const trimmed = value.trim();
        if (!trimmed) return false;
        if (trimmed.includes('여기에_')) return false;
        if (trimmed.includes('YOUR_')) return false;
        return true;
    };

    window.auctiontalkSupabase = null;
    window.AUCTIONTALK_SUPABASE_READY = false;

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.warn('[AuctionTalk] Supabase CDN이 로드되지 않았습니다.');
        return;
    }

    if (!isFilled(settings.url) || !isFilled(settings.anonKey)) {
        console.warn('[AuctionTalk] Supabase 설정값이 비어 있어 localStorage 폴백 모드로 동작합니다.');
        return;
    }

    try {
        window.auctiontalkSupabase = window.supabase.createClient(settings.url, settings.anonKey);
        window.AUCTIONTALK_SUPABASE_READY = true;
        console.log('[AuctionTalk] Supabase 연결 준비 완료');
    } catch (error) {
        console.error('[AuctionTalk] Supabase 초기화 실패:', error);
    }
})();

