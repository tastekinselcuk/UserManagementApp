namespace UserManagementApp.Models
{
    public class PaginationParameters
    {
        private const int MaxPerPage = 100;
        private int _perPage = 20;

        public int Page { get; set; } = 1;
        
        public int PerPage
        {
            get => _perPage;
            set => _perPage = value > MaxPerPage ? MaxPerPage : value;
        }
    }

    public class PaginatedResponse<T>
    {
        public IEnumerable<T> Data { get; set; } = default!;
        public int CurrentPage { get; set; }
        public int TotalPages { get; set; }
        public int TotalCount { get; set; }
    }
}
