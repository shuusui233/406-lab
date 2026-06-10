async function requestJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  let result = null;

  try {
    result = await response.json();
  } catch (error) {
    throw new Error('接口返回的不是有效 JSON。');
  }

  if (!response.ok || !result.success) {
    throw new Error(result?.message || '接口请求失败。');
  }

  return result.data;
}

export function getProjects(category) {
  const search = new URLSearchParams();
  if (category) {
    search.set('category', category);
  }

  const queryString = search.toString();
  const requestUrl = queryString
    ? `/api/projects?${queryString}`
    : '/api/projects';

  return requestJson(requestUrl);
}

export function getProjectDetail(id) {
  return requestJson(`/api/projects/${encodeURIComponent(id)}`);
}
