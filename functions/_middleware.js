export async function onRequest(context) {
    const { request, next, env } = context;
    const url = new URL(request.url);

    // 1. SAFETY FILTER: Only run this on actual HTML pages
    const isExcluded = url.pathname.match(/\.(js|css|json|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2)$/) ||
        url.pathname.includes('/configs/');

    if (isExcluded) {
        return next();
    }

    try {
        // 2. Determine the config name
        let configName = url.searchParams.get('config');

        // Subdomain detection
        if (!configName) {
            const hostname = url.hostname;
            const parts = hostname.split('.');
            if (parts.length > 2 && !hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
                configName = parts[0];
            }
        }

        // Serving page as is if no config or if config is default
        if (!configName || configName === 'default') {
            return next();
        }

        // 3. Fetch the config JSON
        const configUrl = new URL(`/configs/${configName}.json`, url.origin);
        const configResponse = await env.ASSETS.fetch(configUrl);

        if (!configResponse.ok) {
            return next();
        }

        const config = await configResponse.json();
        const displayName = config.companyName || config.name || "AC Service Technician";
        const pageTitle = `Share your experience about ${displayName}!`;
        const pageDesc = `Help ${displayName} grow by sharing your feedback. Quick, interactive, and takes less than a minute!`;

        const cleanUrl = `${url.protocol}//${url.host}${url.pathname}?config=${configName}`;
        const screenshotUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(cleanUrl)}?w=1200&h=630`;

        // 4. Get the original response
        const response = await next();

        // 5. Only transform if it's actually HTML
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
            return response;
        }

        return new HTMLRewriter()
            .on('title', {
                element(e) { e.setInnerContent(pageTitle); }
            })
            .on('meta[property="og:title"]', {
                element(e) { e.setAttribute('content', pageTitle); }
            })
            .on('meta[property="og:description"]', {
                element(e) { e.setAttribute('content', pageDesc); }
            })
            .on('meta[property="og:url"]', {
                element(e) { e.setAttribute('content', cleanUrl); }
            })
            .on('meta[property="og:image"]', {
                element(e) { e.setAttribute('content', screenshotUrl); }
            })
            .on('meta[property="twitter:title"]', {
                element(e) { e.setAttribute('content', pageTitle); }
            })
            .on('meta[property="twitter:description"]', {
                element(e) { e.setAttribute('content', pageDesc); }
            })
            .on('meta[property="twitter:url"]', {
                element(e) { e.setAttribute('content', cleanUrl); }
            })
            .on('meta[property="twitter:image"]', {
                element(e) { e.setAttribute('content', screenshotUrl); }
            })
            .transform(response);
    } catch (err) {
        return next();
    }
}