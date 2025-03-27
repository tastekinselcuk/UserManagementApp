namespace UserManagementApp.Models
{
    public class Todo
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public required string Title { get; set; }
        public required string Status { get; set; }
        public DateTime DueOn { get; set; }
    }
}
