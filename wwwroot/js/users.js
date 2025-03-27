let isEditing = false;
const MAX_RETRIES = 3;
let currentPage = 1;
const perPage = 20;

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
});

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

async function loadUsers(page = 1) {
    showLoading(true);
    try {
        const response = await fetch(`/Users/GetUsers?page=${page}&perPage=${perPage}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        
        if (result.success) {
            displayUsers(result.data);
            updatePagination(result.pagination);
            currentPage = page;
        } else {
            throw new Error(result.message || 'Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Failed to load users. Please check your network connection and try again.', 'danger');
    } finally {
        showLoading(false);
    }
}

function updatePagination(pagination) {
    // Add pagination UI update logic here
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
    new bootstrap.Modal(document.getElementById('userModal')).show();
}

async function editUser(id) {
    try {
        const user = await fetchWithRetry(`/Users/GetUser/${id}`);
        
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
        await loadUsers();
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

function showAlert(message, type) {
    const alert = document.getElementById('alertMessage');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.classList.remove('d-none');
    setTimeout(() => alert.classList.add('d-none'), 5000);
}
