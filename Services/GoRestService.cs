using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using UserManagementApp.Models;

namespace UserManagementApp.Services
{
    public class GoRestService : IGoRestService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiToken;
        private const string BaseUrl = "public/v2";
        private static readonly JsonSerializerOptions _jsonOptions = new() 
        { 
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };
        private const int MaxRetries = 3;

        public GoRestService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiToken = configuration["ApiSettings:GoRestToken"] ?? throw new InvalidOperationException("API token not found");
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiToken);
        }

        private async Task<T> ExecuteWithRetryAsync<T>(Func<Task<T>> operation)
        {
            Exception? lastException = null;

            for (int i = 0; i < MaxRetries; i++)
            {
                try
                {
                    return await operation();
                }
                catch (Exception ex)
                {
                    lastException = ex;
                    if (i < MaxRetries - 1)
                    {
                        await Task.Delay(1000 * (i + 1));
                    }
                }
            }

            throw new ApplicationException("Operation failed after multiple retries", lastException);
        }

        public async Task<(IEnumerable<User> Users, int TotalCount)> GetUsers(int page = 1, int perPage = 20)
        {
            var response = await _httpClient.GetAsync($"{BaseUrl}/users?page={page}&per_page={perPage}");
            response.EnsureSuccessStatusCode();

            var totalCount = int.Parse(response.Headers.GetValues("X-Pagination-Total").FirstOrDefault() ?? "0");
            var users = await JsonSerializer.DeserializeAsync<IEnumerable<User>>(
                await response.Content.ReadAsStreamAsync(),
                _jsonOptions) ?? Array.Empty<User>();

            return (users, totalCount);
        }

        public async Task<User> GetUser(int id)
        {
            return await ExecuteWithRetryAsync(async () =>
            {
                var response = await _httpClient.GetAsync($"{BaseUrl}/users/{id}");
                response.EnsureSuccessStatusCode();
                var stream = await response.Content.ReadAsStreamAsync();
                return await JsonSerializer.DeserializeAsync<User>(stream, _jsonOptions) 
                    ?? throw new InvalidOperationException("Failed to deserialize user");
            });
        }

        public async Task<User> CreateUser(User user)
        {
            try
            {
                var requestData = new
                {
                    name = user.Name,
                    email = user.Email,
                    gender = user.Gender.ToLower(),
                    status = user.Status.ToLower()
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(requestData, _jsonOptions),
                    Encoding.UTF8,
                    "application/json");

                var response = await _httpClient.PostAsync($"{BaseUrl}/users", content);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    throw new HttpRequestException($"API Error: {errorContent}");
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<User>(responseContent, _jsonOptions) 
                    ?? throw new InvalidOperationException("Failed to deserialize created user");
            }
            catch (Exception ex)
            {
                throw new ApplicationException($"Failed to create user: {ex.Message}", ex);
            }
        }

        public async Task<User> UpdateUser(int id, User user)
        {
            try
            {
                var requestData = new
                {
                    name = user.Name,
                    email = user.Email,
                    status = user.Status.ToLower()
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(requestData, _jsonOptions),
                    Encoding.UTF8,
                    "application/json");

                // Use PATCH instead of PUT as per API documentation
                var request = new HttpRequestMessage(HttpMethod.Patch, $"{BaseUrl}/users/{id}")
                {
                    Content = content
                };

                var response = await _httpClient.SendAsync(request);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    throw new HttpRequestException($"API Error: {errorContent}");
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<User>(responseContent, _jsonOptions) 
                    ?? throw new InvalidOperationException("Failed to deserialize updated user");
            }
            catch (Exception ex)
            {
                throw new ApplicationException($"Failed to update user: {ex.Message}", ex);
            }
        }

        public async Task DeleteUser(int id)
        {
            await ExecuteWithRetryAsync(async () =>
            {
                var response = await _httpClient.DeleteAsync($"{BaseUrl}/users/{id}");
                response.EnsureSuccessStatusCode();
                return response;
            });
        }

        public async Task<IEnumerable<Post>> GetUserPosts(int userId)
        {
            var response = await _httpClient.GetAsync($"{BaseUrl}/users/{userId}/posts");
            response.EnsureSuccessStatusCode();

            return await JsonSerializer.DeserializeAsync<IEnumerable<Post>>(
                await response.Content.ReadAsStreamAsync(),
                _jsonOptions) ?? Array.Empty<Post>();
        }

        public async Task<Post> CreateUserPost(int userId, Post post)
        {
            var content = new StringContent(
                JsonSerializer.Serialize(post, _jsonOptions),
                Encoding.UTF8,
                "application/json");

            var response = await _httpClient.PostAsync($"{BaseUrl}/users/{userId}/posts", content);
            response.EnsureSuccessStatusCode();

            return await JsonSerializer.DeserializeAsync<Post>(
                await response.Content.ReadAsStreamAsync(),
                _jsonOptions) ?? throw new InvalidOperationException("Failed to create post");
        }

        public async Task<IEnumerable<Todo>> GetUserTodos(int userId)
        {
            var response = await _httpClient.GetAsync($"{BaseUrl}/users/{userId}/todos");
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<IEnumerable<Todo>>(content, _jsonOptions) ?? Array.Empty<Todo>();
        }

        public async Task<Todo> CreateUserTodo(int userId, Todo todo)
        {
            var content = new StringContent(
                JsonSerializer.Serialize(todo),
                Encoding.UTF8,
                MediaTypeHeaderValue.Parse("application/json").ToString());

            var response = await _httpClient.PostAsync($"{BaseUrl}/users/{userId}/todos", content);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<Todo>(responseContent, _jsonOptions) 
                ?? throw new InvalidOperationException("Failed to create todo");
        }
    }
}
