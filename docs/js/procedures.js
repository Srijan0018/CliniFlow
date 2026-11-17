(function () {
  const procedures = window.CLINIFLOW_PROCEDURES;
  if (!Array.isArray(procedures) || !procedures.length) {
    throw new Error('Procedure guide data is missing.');
  }

  const $ = (id) => document.getElementById(id);
  const grid = $('serviceGrid');
  const search = $('serviceSearch');
  const servicesView = $('servicesView');
  const detailView = $('detailView');
  const emptyState = $('emptyState');

  function renderServices(query) {
    const needle = query.trim().toLowerCase();
    grid.replaceChildren();
    const matches = procedures.filter((service) =>
      `${service.name} ${service.category}`.toLowerCase().includes(needle)
    );
    matches.forEach((service) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'service-card';
      card.dataset.procedure = service.id;
      card.setAttribute('aria-label', `${service.name}, ${service.category}`);

      const icon = document.createElement('span');
      icon.className = 'service-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = service.icon;

      const copy = document.createElement('span');
      copy.className = 'service-copy';
      const name = document.createElement('h3');
      name.textContent = service.name;
      const category = document.createElement('p');
      category.textContent = service.category;
      copy.append(name, category);

      const arrow = document.createElement('span');
      arrow.className = 'service-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      card.append(icon, copy, arrow);
      grid.appendChild(card);
    });
    emptyState.hidden = matches.length > 0;
  }

  function showProcedure(service) {
    $('detailIcon').textContent = service.icon;
    $('detailCategory').textContent = service.category;
    $('detailTitle').textContent = service.name;
    $('locationName').textContent = service.destinationName;
    $('locationAddress').textContent = `${service.building} · ${service.floor}`;

    const mapUrl = `index.html?to=${encodeURIComponent(service.destinationId)}`;
    $('mapLink').href = mapUrl;
    $('directionsButton').href = mapUrl;

    const list = $('requirementsList');
    list.replaceChildren();
    service.requirements.forEach((requirement) => {
      const item = document.createElement('li');
      item.textContent = requirement;
      list.appendChild(item);
    });
    servicesView.hidden = true;
    detailView.hidden = false;
    window.scrollTo(0, 0);
  }

  function render() {
    const id = location.hash.slice(1);
    const service = procedures.find((item) => item.id === id);
    if (service) {
      showProcedure(service);
      return;
    }
    detailView.hidden = true;
    servicesView.hidden = false;
    renderServices(search.value);
  }

  grid.addEventListener('click', (event) => {
    const card = event.target.closest('[data-procedure]');
    if (card) location.hash = card.dataset.procedure;
  });
  search.addEventListener('input', () => renderServices(search.value));
  $('backButton').addEventListener('click', () => { location.hash = 'services'; });
  window.addEventListener('hashchange', render);

  renderServices('');
  render();
})();
