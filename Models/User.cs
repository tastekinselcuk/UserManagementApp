namespace UserManagementApp.Models
{
    public class User
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public required string Email { get; set; }
        public required string Gender { get; set; }
        public required string Status { get; set; }
    }
}
