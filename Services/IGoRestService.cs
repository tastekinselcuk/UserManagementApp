using UserManagementApp.Models;

namespace UserManagementApp.Services
{
    public interface IGoRestService
    {
        Task<(IEnumerable<User> Users, int TotalCount)> GetUsers(int page = 1, int perPage = 20);
        Task<User> GetUser(int id);
        Task<User> CreateUser(User user);
        Task<User> UpdateUser(int id, User user);
        Task DeleteUser(int id);

    }
}
