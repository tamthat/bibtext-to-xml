function parseBibTeX(bibtex) {
    const result = {};
    
    // Tìm type và key
    const typeMatch = bibtex.match(/@(\w+)\s*{([^,]+),/);
    if (!typeMatch) return null;
    
    result.type = typeMatch[1].toLowerCase();
    result.key = typeMatch[2].trim();
    
    // Lấy nội dung fields
    const contentStart = bibtex.indexOf(',', typeMatch[0].length) + 1;
    const contentEnd = bibtex.lastIndexOf('}');
    let content = bibtex.slice(contentStart, contentEnd);
    
    // Tách fields
    const fields = [];
    let current = '';
    let braceLevel = 0;
    let inQuotes = false;
    
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === '{' && !inQuotes) {
            braceLevel++;
        } else if (char === '}' && !inQuotes) {
            braceLevel--;
        } else if (char === ',' && braceLevel === 0 && !inQuotes) {
            if (current.trim()) fields.push(current.trim());
            current = '';
            continue;
        }
        current += char;
    }
    if (current.trim()) fields.push(current.trim());
    
    // Phân tích từng field
    for (let field of fields) {
        const equalIndex = field.indexOf('=');
        if (equalIndex === -1) continue;
        
        const key = field.slice(0, equalIndex).trim();
        let value = field.slice(equalIndex + 1).trim();
        
        // Xử lý giá trị
        let cleanedValue = value;
        if (value.startsWith('{') && value.endsWith('}')) {
            cleanedValue = value.slice(1, -1).trim();
        } else if (value.startsWith('"') && value.endsWith('"')) {
            cleanedValue = value.slice(1, -1).trim();
        }
        
        // Làm sạch HTML và ký tự đặc biệt
        cleanedValue = cleanedValue
            .replace(/<[^\>]+>/g, '') // Xóa thẻ HTML
            .replace(/{\\[a-zA-Z]+ (.*?)}/g, '$1') // Xóa LaTeX
            .replace(/\\[a-zA-Z]+{(.)}/g, '$1') // Xóa LaTeX kiểu \"o
            .replace(/\\[a-zA-Z]+(.)\b/g, '$1') // Xóa LaTeX kiểu \'e
            .replace(/â€“/g, '–')
            .replace(/â€/g, '"')
            .replace(/â€™/g, "'")
            .replace(/[ÃÄ][a-zA-Z]/g, match => {
                const map = { 'Ã©': 'é', 'Ãè': 'è', 'Ãê': 'ê', 'Ãë': 'ë', 'Ãñ': 'ñ', 'Ãü': 'ü', 'Ãö': 'ö', 'Ãâ': 'â' };
                return map[match] || match;
            });
        
        result[key.toLowerCase()] = cleanedValue;
    }
    
    return result;
}

function cleanDOI(doi) {
    // Xóa các tiền tố và chuẩn hóa DOI
    return doi.replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:)/i, '').trim();
}

function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function bibTeXToXML(data) {
    if (!data) return '';
    
    // Chuẩn hóa type
    const typeMap = {
        'book': 'Book',
        'inbook': 'BookSection',
        'article': 'JournalArticle',
        'inproceedings': 'ConferenceProceedings',
        'techreport': 'Report',
        'misc': 'Misc',
        'website': 'InternetSite',
        'periodical': 'ArticleInAPeriodical',
        'phdthesis': 'Report'
    };
    const sourceType = typeMap[data.type] || 'Misc';
    
    // Xử lý author
    let lastName = data.author || '';
    if (lastName.includes(' and ')) {
        lastName = lastName.split(' and ')[0].trim();
    }
    
    // Xử lý editor
    let editorName = data.editor || '';
    if (editorName.includes(' and ')) {
        editorName = editorName.split(' and ')[0].trim();
    }
    
    // Hàm tạo XML cho từng loại
    const xmlTemplates = {
        Book: () => `<b:Source><b:Tag>${data.key || 'Unknown'}</b:Tag><b:SourceType>Book</b:SourceType><b:Guid>{${generateGUID().toUpperCase()}}</b:Guid><b:Title>${data.title || ''}</b:Title><b:Year>${data.year || ''}</b:Year><b:URL>${data.url || ''}</b:URL><b:City>${data.address || ''}</b:City><b:Publisher>${data.publisher || ''}</b:Publisher><b:StateProvince>${data.state || ''}</b:StateProvince><b:CountryRegion>${data.country || ''}</b:CountryRegion><b:Volume>${data.volume || ''}</b:Volume><b:NumberVolumes>${data.number || ''}</b:NumberVolumes><b:ShortTitle>${data.shorttitle || ''}</b:ShortTitle><b:StandardNumber>${data.isbn || data.issn || ''}</b:StandardNumber><b:Pages>${(data.pages || '').replace('–', '-')}</b:Pages><b:Edition>${data.edition || ''}</b:Edition><b:Comments>${data.note || ''}</b:Comments><b:Medium>${data.medium || ''}</b:Medium><b:YearAccessed>${data.yearaccessed || ''}</b:YearAccessed><b:MonthAccessed>${data.monthaccessed || ''}</b:MonthAccessed><b:DayAccessed>${data.dayaccessed || ''}</b:DayAccessed><b:DOI>${data.doi || ''}</b:DOI><b:Author><b:Author><b:NameList><b:Person><b:Last>${lastName}</b:Last></b:Person></b:NameList></b:Author><b:Editor><b:NameList><b:Person><b:Last>${editorName}</b:Last></b:Person></b:NameList></b:Editor><b:Translator><b:NameList><b:Person><b:Last>${data.translator || ''}</b:Last></b:Person></b:NameList></b:Translator></b:Author></b:Source>`,
        BookSection: () => `<b:Source><b:Tag>${data.key || 'Unknown'}</b:Tag><b:SourceType>BookSection</b:SourceType><b:Guid>{${generateGUID().toUpperCase()}}</b:Guid><b:Title>${data.title || ''}</b:Title><b:Year>${data.year || ''}</b:Year><b:City>${data.address || ''}</b:City><b:Publisher>${data.publisher || ''}</b:Publisher><b:BookTitle>${data.booktitle || ''}</b:BookTitle><b:Pages>${(data.pages || '').replace('–', '-')}</b:Pages><b:StateProvince>${data.state || ''}</b:StateProvince><b:CountryRegion>${data.country || ''}</b:CountryRegion><b:Volume>${data.volume || ''}</b:Volume><b:NumberVolumes>${data.number || ''}</b:NumberVolumes><b:ChapterNumber>${data.chapter || ''}</b:ChapterNumber><b:ShortTitle>${data.shorttitle || ''}</b:ShortTitle><b:StandardNumber>${data.isbn || data.issn || ''}</b:StandardNumber><b:Edition>${data.edition || ''}</b:Edition><b:Comments>${data.note || ''}</b:Comments><b:Medium>${data.medium || ''}</b:Medium><b:YearAccessed>${data.yearaccessed || ''}</b:YearAccessed><b:MonthAccessed>${data.monthaccessed || ''}</b:MonthAccessed><b:DayAccessed>${data.dayaccessed || ''}</b:DayAccessed><b:URL>${data.url || ''}</b:URL><b:DOI>${data.doi || ''}</b:DOI><b:Author><b:Author><b:NameList><b:Person><b:Last>${lastName}</b:Last></b:Person></b:NameList></b:Author><b:BookAuthor><b:NameList><b:Person><b:Last>${data.bookauthor || lastName}</b:Last></b:Person></b:NameList></b:BookAuthor><b:Editor><b:NameList><b:Person><b:Last>${editorName}</b:Last></b:Person></b:NameList></b:Editor><b:Translator><b:NameList><b:Person><b:Last>${data.translator || ''}</b:Last></b:Person></b:NameList></b:Translator></b:Author></b:Source>`,
        JournalArticle: () => `<b:Source><b:Tag>${data.key || 'Unknown'}</b:Tag><b:SourceType>JournalArticle</b:SourceType><b:Guid>{${generateGUID().toUpperCase()}}</b:Guid><b:Title>${data.title || ''}</b:Title><b:Year>${data.year || ''}</b:Year><b:Pages>${(data.pages || '').replace('–', '-')}</b:Pages><b:City>${data.address || ''}</b:City><b:Publisher>${data.publisher || ''}</b:Publisher><b:JournalName>${data.journal || ''}</b:JournalName><b:Month>${data.month || ''}</b:Month><b:Day>${data.day || ''}</b:Day><b:Volume>${data.volume || ''}</b:Volume><b:Issue>${data.number || ''}</b:Issue><b:ShortTitle>${data.shorttitle || ''}</b:ShortTitle><b:StandardNumber>${data.issn || ''}</b:StandardNumber><b:Comments>${data.note || ''}</b:Comments><b:Medium>${data.medium || ''}</b:Medium><b:YearAccessed>${data.yearaccessed || ''}</b:YearAccessed><b:MonthAccessed>${data.monthaccessed || ''}</b:MonthAccessed><b:DayAccessed>${data.dayaccessed || ''}</b:DayAccessed><b:URL>${data.url || ''}</b:URL><b:DOI>${data.doi || ''}</b:DOI><b:Author><b:Author><b:NameList><b:Person><b:Last>${lastName}</b:Last></b:Person></b:NameList></b:Author><b:Editor><b:NameList><b:Person><b:Last>${editorName}</b:Last></b:Person></b:NameList></b:Editor></b:Author></b:Source>`,
        ArticleInAPeriodical: () => `<b:Source><b:Tag>${data.key || 'Unknown'}</b:Tag><b:SourceType>ArticleInAPeriodical</b:SourceType><b:Guid>{${generateGUID().toUpperCase()}}</b:Guid><b:Title>${data.title || ''}</b:Title><b:Year>${data.year || ''}</b:Year><b:Pages>${(data.pages || '').replace('–', '-')}</b:Pages><b:PeriodicalTitle>${data.journal || ''}</b:PeriodicalTitle><b:Month>${data.month || ''}</b:Month><b:Day>${data.day || ''}</b:Day><b:Author><b:Author><b:NameList><b:Person><b:Last>${lastName}</b:Last></b:Person></b:NameList></b:Author><b:Editor><b:NameList><b:Person><b:Last>${editorName}</b:Last></b:Person></b:NameList></b:Editor></b:Author><b:City>${data.address || ''}</b:City><b:Publisher>${data.publisher || ''}</b:Publisher><b:Edition>${data.edition || ''}</b:Edition><b:Volume>${data.volume || ''}</b:Volume><b:Issue>${data.number || ''}</b:Issue><b:ShortTitle>${data.shorttitle || ''}</b:ShortTitle><b:StandardNumber>${data.issn || ''}</b:StandardNumber><b:Comments>${data.note || ''}</b:Comments><b:Medium>${data.medium || ''}</b:Medium><b:YearAccessed>${data.yearaccessed || ''}</b:YearAccessed><b:MonthAccessed>${data.monthaccessed || ''}</b:MonthAccessed><b:DayAccessed>${data.dayaccessed || ''}</b:DayAccessed><b:URL>${data.url || ''}</b:URL><b:DOI>${data.doi || ''}</b:DOI></b:Source>`,
        ConferenceProceedings: () => `<b:Source><b:Tag>${data.key || 'Unknown'}</b:Tag><b:SourceType>ConferenceProceedings</b:SourceType><b:Guid>{${generateGUID().toUpperCase()}}</b:Guid><b:Title>${data.title || ''}</b:Title><b:Year>${data.year || ''}</b:Year><b:Pages>${(data.pages || '').replace('–', '-')}</b:Pages><b:ConferenceName>${data.booktitle || ''}</b:ConferenceName><b:City>${data.address || ''}</b:City><b:Publisher>${data.publisher || ''}</b:Publisher><b:Author><b:Author><b:NameList><b:Person><b:Last>${lastName}</b:Last></b:Person></b:NameList></b:Author><b:Editor><b:NameList><b:Person><b:Last>${editorName}</b:Last></b:Person></b:NameList></b:Editor></b:Author><b:Volume>${data.volume || ''}</b:Volume><b:ShortTitle>${data.shorttitle || ''}</b:ShortTitle><b:StandardNumber>${data.isbn || data.issn || ''}</b:StandardNumber><b:Comments>${data.note || ''}</b:Comments><b:Medium>${data.medium || ''}</b:Medium><b:YearAccessed>${data.yearaccessed || ''}</b:YearAccessed><b:MonthAccessed>${data.monthaccessed || ''}</b:MonthAccessed><b:DayAccessed>${data.dayaccessed || ''}</b:DayAccessed><b:URL>${data.url || ''}</b:URL><b:DOI>${data.doi || ''}</b:DOI></b:Source>`,
        Report: () => `<b:Source><b:Tag>${data.key || 'Unknown'}</b:Tag><b:SourceType>Report</b:SourceType><b:Guid>{${generateGUID().toUpperCase()}}</b:Guid><b:Title>${data.title || ''}</b:Title><b:Pages>${(data.pages || '').replace('–', '-')}</b:Pages><b:Year>${data.year || ''}</b:Year><b:City>${data.address || ''}</b:City><b:Publisher>${data.publisher || ''}</b:Publisher><b:Author><b:Author><b:NameList><b:Person><b:Last>${lastName}</b:Last></b:Person></b:NameList></b:Author></b:Author><b:Department>${data.department || ''}</b:Department><b:Institution>${data.school || data.institution || ''}</b:Institution><b:ThesisType>${data.thesistype || 'PhD thesis'}</b:ThesisType><b:ShortTitle>${data.shorttitle || ''}</b:ShortTitle><b:StandardNumber>${data.issn || ''}</b:StandardNumber><b:Comments>${data.note || ''}</b:Comments><b:Medium>${data.medium || ''}</b:Medium><b:YearAccessed>${data.yearaccessed || ''}</b:YearAccessed><b:MonthAccessed>${data.monthaccessed || ''}</b:MonthAccessed><b:DayAccessed>${data.dayaccessed || ''}</b:DayAccessed><b:URL>${data.url || ''}</b:URL><b:DOI>${data.doi || ''}</b:DOI></b:Source>`,
        InternetSite: () => `<b:Source><b:Tag>${data.key || 'Unknown'}</b:Tag><b:SourceType>InternetSite</b:SourceType><b:Guid>{${generateGUID().toUpperCase()}}</b:Guid><b:Title>${data.title || ''}</b:Title><b:Year>${data.year || ''}</b:Year><b:Author><b:Author><b:NameList><b:Person><b:Last>${lastName}</b:Last></b:Person></b:NameList></b:Author><b:Editor><b:NameList><b:Person><b:Last>${editorName}</b:Last></b:Person></b:NameList></b:Editor><b:ProducerName><b:NameList><b:Person><b:Last>${data.producer || ''}</b:Last></b:Person></b:NameList></b:ProducerName></b:Author><b:InternetSiteTitle>${data.journal || data.website || ''}</b:InternetSiteTitle><b:Month>${data.month || ''}</b:Month><b:Day>${data.day || ''}</b:Day><b:URL>${data.url || ''}</b:URL><b:ProductionCompany>${data.publisher || ''}</b:ProductionCompany><b:YearAccessed>${data.yearaccessed || ''}</b:YearAccessed><b:MonthAccessed>${data.monthaccessed || ''}</b:MonthAccessed><b:DayAccessed>${data.dayaccessed || ''}</b:DayAccessed><b:Version>${data.version || ''}</b:Version><b:ShortTitle>${data.shorttitle || ''}</b:ShortTitle><b:StandardNumber>${data.issn || ''}</b:StandardNumber><b:Comments>${data.note || ''}</b:Comments><b:Medium>${data.medium || ''}</b:Medium><b:DOI>${data.doi || ''}</b:DOI></b:Source>`,
        Misc: () => `<b:Source><b:Tag>${data.key || 'Unknown'}</b:Tag><b:SourceType>Misc</b:SourceType><b:Guid>{${generateGUID().toUpperCase()}}</b:Guid><b:Title>${data.title || ''}</b:Title><b:Year>${data.year || ''}</b:Year><b:Month>${data.month || ''}</b:Month><b:Day>${data.day || ''}</b:Day><b:URL>${data.url || ''}</b:URL><b:YearAccessed>${data.yearaccessed || ''}</b:YearAccessed><b:MonthAccessed>${data.monthaccessed || ''}</b:MonthAccessed><b:DayAccessed>${data.dayaccessed || ''}</b:DayAccessed><b:ShortTitle>${data.shorttitle || ''}</b:ShortTitle><b:StandardNumber>${data.issn || data.isbn || ''}</b:StandardNumber><b:Comments>${data.note || ''}</b:Comments><b:Medium>${data.medium || ''}</b:Medium><b:DOI>${data.doi || ''}</b:DOI><b:Author><b:Author><b:NameList><b:Person><b:Last>${lastName}</b:Last></b:Person></b:NameList></b:Author><b:Editor><b:NameList><b:Person><b:Last>${editorName}</b:Last></b:Person></b:NameList></b:Editor><b:Translator><b:NameList><b:Person><b:Last>${data.translator || ''}</b:Last></b:Person></b:NameList></b:Translator><b:Compiler><b:NameList><b:Person><b:Last>${data.compiler || ''}</b:Last></b:Person></b:NameList></b:Compiler></b:Author><b:PublicationTitle>${data.journal || data.booktitle || ''}</b:PublicationTitle><b:City>${data.address || ''}</b:City><b:StateProvince>${data.state || ''}</b:StateProvince><b:CountryRegion>${data.country || ''}</b:CountryRegion><b:Publisher>${data.publisher || ''}</b:Publisher><b:Pages>${(data.pages || '').replace('–', '-')}</b:Pages><b:Volume>${data.volume || ''}</b:Volume><b:Edition>${data.edition || ''}</b:Edition><b:Issue>${data.number || ''}</b:Issue></b:Source>`
    };
    
    return xmlTemplates[sourceType] ? xmlTemplates[sourceType]() : xmlTemplates.Misc();
}

function displayResult(data) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';
    
    if (!data) {
        resultDiv.innerHTML = '<div class="error">Invalid BibTeX data</div>';
        document.getElementById('xmlOutput').innerHTML = '';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'result-table';
    
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>Key</th><th>Value</th>';
    table.appendChild(headerRow);
    
    for (let [key, value] of Object.entries(data)) {
        const row = document.createElement('tr');
        if (key === "url") {
            row.innerHTML = `<td>${key}</td><td><a href="${value}" style="text-decoration: none; color: inherit;">${value}</a></td>`;
        } else {
            row.innerHTML = `<td>${key}</td><td>${value}</td>`;
        }
        table.appendChild(row);
    }
    
    resultDiv.appendChild(table);
    
    // Hiển thị XML output
    const xmlDiv = document.getElementById('xmlOutput');
    xmlDiv.innerHTML = '';
    
    const xmlHeader = document.createElement('h3');
    xmlHeader.textContent = 'XML Output';
    xmlDiv.appendChild(xmlHeader);
    
    const xmlContent = document.createElement('pre');
    xmlContent.textContent = bibTeXToXML(data);
    xmlDiv.appendChild(xmlContent);
}

async function fetchBibTeX() {
    const doiInput = document.getElementById('doiInput').value;
    const cleanDoi = cleanDOI(doiInput);
    
    if (!cleanDoi) {
        document.getElementById('result').innerHTML = '<div class="error">Please enter a valid DOI</div>';
        document.getElementById('xmlOutput').innerHTML = '';
        return;
    }
    
    const url = `https://doi.org/${cleanDoi}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/x-bibtex'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch BibTeX');
        }
        
        const bibtex = await response.text();
        console.log(bibtex);
        const data = parseBibTeX(bibtex);
        displayResult(data);
    } catch (error) {
        document.getElementById('result').innerHTML = `<div class="error">Error: ${error.message}</div>`;
        document.getElementById('xmlOutput').innerHTML = '';
    }
}
