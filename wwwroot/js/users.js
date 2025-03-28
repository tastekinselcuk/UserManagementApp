let isEditing = false;
const MAX_RETRIES = 3;
let currentPage = 1;
const VISIBLE_PAGE_NUMBERS = 5;
let paginationState = {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    perPage: 20
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize from URL state
    const urlParams = new URLSearchParams(window.location.search);
    const page = parseInt(urlParams.get('page')) || 1;
    const perPage = parseInt(urlParams.get('per_page')) || 20;
    const userId = urlParams.get('userId');
    
    // Set initial perPage in select element
    document.getElementById('perPageSelect').value = perPage;
    paginationState.perPage = perPage;
    
    // Update browser title based on state
    updateBrowserTitle(userId ? 'Edit User' : 'User List');
    
    if (userId) {
        editUser(userId);
    } else {
        loadUsers(page);
    }

    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
        const state = event.state || {};
        if (state.userId) {
            editUser(state.userId, false); // false means don't push new state
        } else {
            loadUsers(state.page || 1, false); // false means don't push new state
        }
        updateBrowserTitle(state.userId ? 'Edit User' : 'User List');
    });

    // Add pagination event listeners
    document.getElementById('prevPage').addEventListener('click', (e) => {
        e.preventDefault();
        if (paginationState.currentPage > 1) {
            navigateToPage(paginationState.currentPage - 1);
        }
    });

    document.getElementById('nextPage').addEventListener('click', (e) => {
        e.preventDefault();
        if (paginationState.currentPage < paginationState.totalPages) {
            navigateToPage(paginationState.currentPage + 1);
        }
    });

    document.getElementById('perPageSelect').addEventListener('change', (e) => {
        paginationState.perPage = parseInt(e.target.value);
        navigateToPage(1); // Reset to first page when changing items per page
    });
});

function updateBrowserTitle(title) {
    document.title = `${title} - UserManagementApp`;
}

async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            },
            credentials: 'same-origin'
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid response format');
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        if (!data.success && data.message) {
            throw new Error(data.message);
        }

        return data.data;
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (MAX_RETRIES - retries + 1)));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
}

async function loadUsers(page = 1, updateHistory = true) {
    showLoading(true);
    try {
        const response = await fetch(`/Users/GetUsers?page=${page}&perPage=${paginationState.perPage}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        
        if (result.success) {
            displayUsers(result.data);
            updatePagination({
                ...result.pagination,
                perPage: paginationState.perPage
            });
        } else {
            throw new Error(result.message || 'Failed to load users');
        }

        if (updateHistory) {
            const url = new URL(window.location);
            url.searchParams.set('page', page);
            url.searchParams.set('per_page', paginationState.perPage);
            window.history.pushState({ 
                page, 
                perPage: paginationState.perPage 
            }, '', url);
            updateBrowserTitle('User List');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Failed to load users. Please check your network connection and try again.', 'danger');
    } finally {
        showLoading(false);
    }
}

function updatePagination(pagination) {
    paginationState = {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        totalCount: pagination.totalCount,
        perPage: pagination.perPage
    };

    // Update info text with per page information
    const infoElement = document.getElementById('paginationInfo');
    const startItem = ((pagination.currentPage - 1) * pagination.perPage) + 1;
    const endItem = Math.min(startItem + pagination.perPage - 1, pagination.totalCount);
    infoElement.textContent = `Showing ${startItem}-${endItem} of ${pagination.totalCount} records`;

    // Update navigation state
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const firstPage = document.getElementById('firstPage');
    const lastPage = document.getElementById('lastPage');
    const firstEllipsis = document.getElementById('firstEllipsis');
    const lastEllipsis = document.getElementById('lastEllipsis');
    
    // Update Previous/Next buttons
    prevPage.classList.toggle('disabled', pagination.currentPage <= 1);
    nextPage.classList.toggle('disabled', pagination.currentPage >= pagination.totalPages);

    // Calculate visible page range
    let startPage = Math.max(1, pagination.currentPage - Math.floor(VISIBLE_PAGE_NUMBERS / 2));
    let endPage = Math.min(pagination.totalPages, startPage + VISIBLE_PAGE_NUMBERS - 1);

    if (endPage - startPage + 1 < VISIBLE_PAGE_NUMBERS) {
        startPage = Math.max(1, endPage - VISIBLE_PAGE_NUMBERS + 1);
    }

    // Update first/last pages and ellipses
    firstPage.classList.toggle('d-none', startPage <= 1);
    firstEllipsis.classList.toggle('d-none', startPage <= 2);
    lastPage.classList.toggle('d-none', endPage >= pagination.totalPages);
    lastEllipsis.classList.toggle('d-none', endPage >= pagination.totalPages - 1);

    // Update last page number
    if (lastPage) {
        const lastPageLink = lastPage.querySelector('a');
        lastPageLink.textContent = pagination.totalPages;
        lastPageLink.dataset.page = pagination.totalPages;
    }

    // Update page numbers
    updatePageNumbers(startPage, endPage, pagination.currentPage);

    // Update URL without reloading
    const url = new URL(window.location);
    url.searchParams.set('page', pagination.currentPage);
    url.searchParams.set('per_page', pagination.perPage);
    window.history.pushState({ page: pagination.currentPage }, '', url);
}

function updatePageNumbers(start, end, currentPage) {
    const pageNumbers = document.getElementById('pageNumbers');
    pageNumbers.innerHTML = '';

    for (let i = start; i <= end; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = i;
        a.dataset.page = i;
        a.onclick = (e) => {
            e.preventDefault();
            navigateToPage(parseInt(e.target.dataset.page));
        };
        
        li.appendChild(a);
        pageNumbers.appendChild(li);
    }
}

function navigateToPage(page) {
    loadUsers(page);
}

function displayUsers(users) {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';
    
    if (!Array.isArray(users) || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No users found</td>
            </tr>`;
        return;
    }
    
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(user.id.toString())}</td>
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td><span class="badge bg-secondary">${escapeHtml(user.gender)}</span></td>
            <td><span class="badge bg-${user.status === 'active' ? 'success' : 'danger'}">${escapeHtml(user.status)}</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-primary" onclick="editUser(${user.id})">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger ms-1" onclick="deleteUser(${user.id})">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showAddUserModal() {
    isEditing = false;
    document.getElementById('userForm').reset();
    document.getElementById('modalTitle').textContent = 'Add New User';
    
    // Update URL and browser history for new user form
    const url = new URL(window.location);
    url.searchParams.delete('userId');
    url.searchParams.delete('page');
    window.history.pushState({ action: 'new' }, '', url);
    updateBrowserTitle('New User');
    
    new bootstrap.Modal(document.getElementById('userModal')).show();
}

async function editUser(id, updateHistory = true) {
    try {
        const user = await fetchWithRetry(`/Users/GetUser/${id}`);
        
        if (updateHistory) {
            const path = routes.detail.replace(':id', id);
            updateUrl(path, { userId: id, action: 'edit' });
            updateBrowserTitle(`Edit User ${user.name}`);
        }
        
        document.getElementById('userId').value = user.id;
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userGender').value = user.gender;
        document.getElementById('userStatus').value = user.status;
        
        document.getElementById('modalTitle').textContent = 'Edit User';
        isEditing = true;
        new bootstrap.Modal(document.getElementById('userModal')).show();
    } catch (error) {
        console.error('Error loading user:', error);
        showAlert('Failed to load user details. Please check your network connection and try again.', 'danger');
    }
}

async function saveUser() {
    const user = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        gender: document.getElementById('userGender').value,
        status: document.getElementById('userStatus').value
    };

    showLoading(true);
    try {
        if (isEditing) {
            const id = document.getElementById('userId').value;
            await fetch(`/Users/UpdateUser/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(user)
            }).then(async response => {
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to update user');
                }
                return response.json();
            });
        } else {
            await fetch('/Users/CreateUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(user)
            }).then(async response => {
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to create user');
                }
                return response.json();
            });
        }

        bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
        
        // Clear URL parameters and update history
        const path = `${routes.list}?page=${currentPage}`;
        updateUrl(path, { page: currentPage });
        updateBrowserTitle('User List');
        
        await loadUsers(currentPage, false);
        showAlert(`User ${isEditing ? 'updated' : 'created'} successfully`, 'success');
    } catch (error) {
        console.error('Error saving user:', error);
        showAlert(error.message || 'Failed to save user. Please try again.', 'danger');
    } finally {
        showLoading(false);
    }
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        await fetchWithRetry(`/Users/DeleteUser/${id}`, {
            method: 'DELETE'
        });
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('Failed to delete user. Please check your network connection and try again.', 'danger');
    }
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.classList.toggle('d-none', !show);
}

function showAlert(message, type, duration = 5000) {
    const alert = document.getElementById('alertMessage');
    const modalAlert = document.getElementById('modalAlert');
    
    [alert, modalAlert].forEach(el => {
        if (el) {
            el.className = `alert alert-${type}`;
            el.textContent = message;
            el.classList.remove('d-none');
            
            if (duration > 0) {
                setTimeout(() => el.classList.add('d-none'), duration);
            }
        }
    });
}

// URL Management
const routes = {
    list: '/users',
    detail: '/users/:id',
    new: '/users/new'
};

function updateUrl(path, state = {}) {
    const url = new URL(window.location.origin + path);
    window.history.pushState(state, '', url);
}

function handleRouting() {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const page = parseInt(params.get('page')) || 1;
    const perPage = parseInt(params.get('per_page')) || 20;

    // Update perPage in state and select element
    paginationState.perPage = perPage;
    document.getElementById('perPageSelect').value = perPage;

    if (path.match(/\/users\/new/)) {
        showAddUserModal();
    } else if (path.match(/\/users\/\d+/)) {
        const userId = path.split('/').pop();
        editUser(parseInt(userId), false);
    } else {
        loadUsers(page, false);
    }
}

// Initialize routing
document.addEventListener('DOMContentLoaded', () => {
    // Handle initial route
    handleRouting();

    // Handle browser navigation
    window.addEventListener('popstate', () => {
        handleRouting();
    });

    // Intercept navigation clicks
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-navigate]')) {
            e.preventDefault();
            const path = e.target.getAttribute('data-navigate');
            updateUrl(path);
            handleRouting();
        }
    });
});
