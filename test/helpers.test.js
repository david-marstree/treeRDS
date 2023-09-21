const helpers = require('./helpers')


test('condition2SQL should have order by in sql statement', () => {

  const result = helpers.condition2SQL('user', { field: 'id', sort: 'asc' });

  expect(result.statement).toMatch(/ORDER BY/i);

});


test('condition2SQL should have group by in sql statement', () => {

  const result = helpers.condition2SQL('user', { group_by: 'id' });
  expect(result.statement).toMatch(/GROUP BY/i);

});


test('condition2SQL should have left join in sql statement', () => {

  const result = helpers.condition2SQL('user', {
    join: {
      website_user: {
        tableName: 'website_user',
        condition: 'website_user.user_id=user.id',
        rel: 'left'
      }
    }
  });
  expect(result.statement).toMatch(/left join \`website_user\` on website_user.user_id=user.id/i);

});



test('condition2SQL should have select in sql statement', () => {

  const result = helpers.condition2SQL('user', {
    select: 'COUNT(id) as num'
  });
  expect(result.statement).toMatch(/as num/i);

});



test('condition2SQL should have where in sql statement', () => {

  const result = helpers.condition2SQL('user', {
    id: 1,
    enable: { ne: 1 }
  });
  console.log(result.statement);
  expect(result.statement).toMatch(/\`enable\`/i);

});